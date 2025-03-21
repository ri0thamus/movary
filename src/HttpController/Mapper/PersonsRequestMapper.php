<?php declare(strict_types=1);

namespace Movary\HttpController\Mapper;

use Movary\Domain\User\Service\UserPageAuthorizationChecker;
use Movary\HttpController\Dto\PersonsRequestDto;
use Movary\ValueObject\Gender;
use Movary\ValueObject\Http\Request;
use Movary\ValueObject\SortOrder;

class PersonsRequestMapper
{
    private const DEFAULT_LIMIT = 24;

    private const DEFAULT_SORT_BY = 'uniqueAppearances';

    public function __construct(
        private readonly UserPageAuthorizationChecker $userPageAuthorizationChecker,
    ) {
    }

    public function mapRenderPageRequest(Request $request) : PersonsRequestDto
    {
        $userId = $this->userPageAuthorizationChecker->findUserIdIfCurrentVisitorIsAllowedToSeeUser((string)$request->getRouteParameters()['username']);

        $getParameters = $request->getGetParameters();

        $searchTerm = $getParameters['s'] ?? null;
        $page = $getParameters['p'] ?? 1;
        $limit = $getParameters['pp'] ?? self::DEFAULT_LIMIT;
        $sortBy = $getParameters['sb'] ?? self::DEFAULT_SORT_BY;
        $sortOrder = $this->mapSortOrder($getParameters);
        $gender = isset($getParameters['ge']) === false || $getParameters['ge'] === '' ? null : Gender::createFromInt((int)$getParameters['ge']);

        return PersonsRequestDto::createFromParameters(
            $userId,
            $searchTerm,
            (int)$page,
            (int)$limit,
            $sortBy,
            $sortOrder,
            $gender,
        );
    }

    private function mapSortOrder(array $getParameters) : SortOrder
    {
        if (isset($getParameters['so']) === false) {
            return SortOrder::createDesc();
        }

        return match ($getParameters['so']) {
            'asc' => SortOrder::createAsc(),
            'desc' => SortOrder::createDesc(),

            default => throw new \RuntimeException('Not supported sort order: ' . $getParameters['so'])
        };
    }
}
