<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class AddDateFormatToUserTable extends AbstractMigration
{
    public function down() : void
    {
        $this->execute(
            <<<SQL
            ALTER TABLE user DROP COLUMN date_format;
            SQL
        );
    }

    public function up() : void
    {
        $this->execute(
            <<<SQL
            ALTER TABLE user ADD COLUMN date_format TINYINT UNSIGNED DEFAULT 0 AFTER password;
            SQL
        );
    }
}
