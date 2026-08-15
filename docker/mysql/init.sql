-- Garante que o usuário photip (criado pelo docker-compose via MYSQL_USER) consiga
-- criar bancos — o Prisma Migrate precisa disso para criar o shadow database
-- (erro P3014/P1010: "User was denied access on the database
-- prisma_migrate_shadow_db_*"). O usuário criado por MYSQL_USER só recebe
-- privilégios no banco `photip` por padrão, insuficiente para o migrate dev.
GRANT ALL PRIVILEGES ON *.* TO 'photip'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;