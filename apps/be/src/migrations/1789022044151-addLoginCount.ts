import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoginCount1789022044151 implements MigrationInterface {
    name = 'AddLoginCount1789022044151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "loginCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "loginCount"`);
    }

}
