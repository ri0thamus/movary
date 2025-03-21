<?php declare(strict_types=1);

namespace Movary\Domain\Movie\Cast;

use Movary\Service\UrlGenerator;

class CastApi
{
    public function __construct(
        private readonly CastRepository $repository,
        private readonly UrlGenerator $urlGenerator,
    ) {
    }

    public function create(int $movieId, int $personId, ?string $character, int $position) : void
    {
        $this->repository->create($movieId, $personId, $character, $position);
    }

    public function deleteByMovieId(int $movieId) : void
    {
        $this->repository->deleteByMovieId($movieId);
    }

    public function findByMovieId(int $movieId) : ?array
    {
        $castMembers = [];

        foreach ($this->repository->findByMovieId($movieId) as $cast) {
            $posterPath = $this->urlGenerator->generateImageSrcUrlFromParameters($cast['tmdb_poster_path'], $cast['poster_path']);

            $castMembers[] = [
                'id' => $cast['id'],
                'name' => $cast['name'],
                'posterPath' => $posterPath,
            ];
        }

        return $castMembers;
    }
}
