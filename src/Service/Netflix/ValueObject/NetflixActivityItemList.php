<?php declare(strict_types=1);

namespace Movary\Service\Netflix\ValueObject;

use Movary\ValueObject\AbstractList;

/**
 * @method NetflixActivityItem[] getIterator()
 * @psalm-suppress ImplementedReturnTypeMismatch
 */
class NetflixActivityItemList extends AbstractList
{
    public static function create() : self
    {
        return new self();
    }

    public function add(NetflixActivityItem $item) : void
    {
        $this->data[] = $item;
    }
}
