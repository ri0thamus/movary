<?php declare(strict_types=1);

namespace Movary;

use Doctrine\DBAL;
use GuzzleHttp;
use Monolog\Formatter\LineFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Movary\Api\Tmdb;
use Movary\Api\Trakt;
use Movary\Api\Trakt\Cache\User\Movie\Watched;
use Movary\Application\Movie;
use Movary\Application\Service\Tmdb\SyncMovie;
use Movary\Application\Service\UrlGenerator;
use Movary\Application\User;
use Movary\Application\User\Service\Authentication;
use Movary\Command;
use Movary\HttpController\PlexController;
use Movary\HttpController\SettingsController;
use Movary\ValueObject\Config;
use Movary\ValueObject\DateFormat;
use Movary\ValueObject\Http\Request;
use Movary\Worker\Service;
use PDO;
use Phinx\Console\PhinxApplication;
use Psr\Container\ContainerInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Log\LoggerInterface;
use Twig;

class Factory
{
    public static function createConfig() : Config
    {
        $dotenv = \Dotenv\Dotenv::createMutable(__DIR__ . '/..');
        $dotenv->safeLoad();

        return Config::createFromEnv();
    }

    public static function createCurrentHttpRequest() : Request
    {
        return Request::createFromGlobals();
    }

    public static function createDatabaseMigrationMigrateCommand(ContainerInterface $container) : Command\DatabaseMigrationMigrate
    {
        return new Command\DatabaseMigrationMigrate(
            $container->get(PhinxApplication::class),
            __DIR__ . '/../settings/phinx.php'
        );
    }

    public static function createDatabaseMigrationRollbackCommand(ContainerInterface $container) : Command\DatabaseMigrationRollback
    {
        return new Command\DatabaseMigrationRollback(
            $container->get(PhinxApplication::class),
            __DIR__ . '/../settings/phinx.php'
        );
    }

    public static function createDatabaseMigrationStatusCommand(ContainerInterface $container) : Command\DatabaseMigrationStatus
    {
        return new Command\DatabaseMigrationStatus(
            $container->get(PhinxApplication::class),
            __DIR__ . '/../settings/phinx.php'
        );
    }

    public static function createDbConnection(Config $config) : DBAL\Connection
    {
        return DBAL\DriverManager::getConnection(
            [
                'charset' => $config->getAsString('DATABASE_CHARSET'),
                'dbname' => $config->getAsString('DATABASE_NAME'),
                'port' => $config->getAsInt('DATABASE_PORT'),
                'user' => $config->getAsString('DATABASE_USER'),
                'password' => $config->getAsString('DATABASE_PASSWORD'),
                'host' => $config->getAsString('DATABASE_HOST'),
                'driver' => $config->getAsString('DATABASE_DRIVER'),
            ]
        );
    }

    public static function createHttpClient() : ClientInterface
    {
        return new GuzzleHttp\Client();
    }

    public static function createLineFormatter(Config $config) : LineFormatter
    {
        $formatter = new LineFormatter(LineFormatter::SIMPLE_FORMAT, LineFormatter::SIMPLE_DATE);
        $formatter->includeStacktraces($config->getAsBool('LOG_ENABLE_STACKTRACE'));

        return $formatter;
    }

    public static function createLogger(ContainerInterface $container, Config $config) : LoggerInterface
    {
        $logger = new Logger('movary');

        $logger->pushHandler(self::createLoggerStreamHandlerStdout($container, $config));

        if ($config->getAsBool('LOG_ENABLE_FILE_LOGGING') === true) {
            $logger->pushHandler(self::createLoggerStreamHandlerFile($container, $config));
        }

        return $logger;
    }

    public static function createPdo(Config $config) : PDO
    {
        $dbName = $config->getAsString('DATABASE_NAME');
        $host = $config->getAsString('DATABASE_HOST');
        $port = $config->getAsString('DATABASE_PORT');
        $charset = $config->getAsString('DATABASE_CHARSET');

        return new PDO(
            "mysql:host={$host};dbname=$dbName;charset=$charset;port=$port",
            $config->getAsString('DATABASE_USER'),
            $config->getAsString('DATABASE_PASSWORD'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
    }

    public static function createPlexController(ContainerInterface $container, Config $config) : PlexController
    {
        try {
            $plexEnableScrobbleWebhook = $config->getAsBool('PLEX_ENABLE_SCROBBLE');
        } catch (\OutOfBoundsException) {
            $plexEnableScrobbleWebhook = true;
        }

        try {
            $plexEnableRatingWebhook = $config->getAsBool('PLEX_ENABLE_RATING');
        } catch (\OutOfBoundsException) {
            $plexEnableRatingWebhook = false;
        }

        return new PlexController(
            $container->get(LoggerInterface::class),
            $container->get(Movie\MovieApi::class),
            $container->get(SyncMovie::class),
            $container->get(User\UserApi::class),
            $container->get(Authentication::class),
            $plexEnableScrobbleWebhook,
            $plexEnableRatingWebhook,
        );
    }

    public static function createSettingsController(ContainerInterface $container, Config $config) : SettingsController
    {
        try {
            $applicationVersion = $config->getAsString('APPLICATION_VERSION');
        } catch (\OutOfBoundsException) {
            $applicationVersion = null;
        }

        return new SettingsController(
            $container->get(Twig\Environment::class),
            $container->get(Service::class),
            $container->get(Authentication::class),
            $container->get(User\UserApi::class),
            $container->get(Movie\MovieApi::class),
            $applicationVersion
        );
    }

    public static function createTmdbApiClient(ContainerInterface $container, Config $config) : Tmdb\Client
    {
        return new Tmdb\Client(
            $container->get(ClientInterface::class),
            $config->getAsString('TMDB_API_KEY')
        );
    }

    public static function createTraktApi(ContainerInterface $container) : Trakt\Api
    {
        return new Trakt\Api(
            $container->get(Trakt\Client::class),
            $container->get(Watched\Service::class),
        );
    }

    public static function createTwigEnvironment(ContainerInterface $container) : Twig\Environment
    {
        $twig = new Twig\Environment($container->get(Twig\Loader\LoaderInterface::class));

        $currentRequest = $container->get(Request::class);
        $routeUsername = $currentRequest->getRouteParameters()['username'] ?? null;

        $userAuthenticated = $container->get(Authentication::class)->isUserAuthenticated();

        $twig->addGlobal('loggedIn', $userAuthenticated);

        $user = null;
        $dateFormatPhp = DateFormat::getPhpDefault();
        $dataFormatJavascript = DateFormat::getJavascriptDefault();
        if ($userAuthenticated === true) {
            $currentUserId = $container->get(Authentication::class)->getCurrentUserId();

            /** @var User\UserEntity $user */
            $user = $container->get(User\UserApi::class)->fetchUser($currentUserId);

            $dateFormatPhp = DateFormat::getPhpById($user->getDateFormatId());
            $dataFormatJavascript = DateFormat::getJavascriptById($user->getDateFormatId());
        }

        $twig->addGlobal('currentUsername', $user?->getName());
        $twig->addGlobal('routeUsername', $routeUsername ?? $user?->getName());
        $twig->addGlobal('dateFormatPhp', $dateFormatPhp);
        $twig->addGlobal('dateFormatJavascript', $dataFormatJavascript);
        $twig->addGlobal('requestUrlPath', self::createCurrentHttpRequest()->getPath());

        return $twig;
    }

    public static function createTwigFilesystemLoader() : Twig\Loader\FilesystemLoader
    {
        return new Twig\Loader\FilesystemLoader(__DIR__ . '/../templates');
    }

    public static function createUrlGenerator(ContainerInterface $container, Config $config) : UrlGenerator
    {
        try {
            $enableImageCaching = $config->getAsBool('TMDB_ENABLE_IMAGE_CACHING');
        } catch (\OutOfBoundsException) {
            $enableImageCaching = false;
        }

        return new UrlGenerator(
            $container->get(Tmdb\TmdbUrlGenerator::class),
            $enableImageCaching
        );
    }

    private static function createLoggerStreamHandlerFile(ContainerInterface $container, Config $config) : StreamHandler
    {
        $streamHandler = new StreamHandler(
            __DIR__ . '/../tmp/app.log',
            $config->getAsString('LOG_LEVEL')
        );
        $streamHandler->setFormatter($container->get(LineFormatter::class));

        return $streamHandler;
    }

    private static function createLoggerStreamHandlerStdout(ContainerInterface $container, Config $config) : StreamHandler
    {
        $streamHandler = new StreamHandler('php://stdout', $config->getAsString('LOG_LEVEL'));
        $streamHandler->setFormatter($container->get(LineFormatter::class));

        return $streamHandler;
    }

    public function createProcessJobCommand(ContainerInterface $container, Config $config) : Command\ProcessJobs
    {
        try {
            $minRuntimeInSeconds = $config->getAsInt('MIN_RUNTIME_IN_SECONDS_FOR_JOB_PROCESSING');
        } catch (\OutOfBoundsException) {
            $minRuntimeInSeconds = null;
        }

        return new Command\ProcessJobs(
            $container->get(Worker\Repository::class),
            $container->get(Worker\Service::class),
            $container->get(LoggerInterface::class),
            $minRuntimeInSeconds,
        );
    }
}
