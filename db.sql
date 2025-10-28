CREATE DATABASE IF NOT EXISTS `railway`
  CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
USE `railway`;

CREATE TABLE IF NOT EXISTS `countries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `capital` VARCHAR(255) DEFAULT NULL,
  `region` VARCHAR(100) DEFAULT NULL,
  `population` BIGINT UNSIGNED DEFAULT NULL,
  `currency_code` VARCHAR(10) DEFAULT NULL,
  `exchange_rate` DOUBLE DEFAULT NULL,
  `estimated_gdp` DOUBLE DEFAULT NULL,
  `flag_url` TEXT DEFAULT NULL,
  `last_refreshed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_countries_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;