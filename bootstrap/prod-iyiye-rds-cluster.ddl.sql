/* Notification DB */

CREATE DATABASE IF NOT EXISTS notif;
CREATE TABLE IF NOT EXISTS notif.in_app_notification (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` VARCHAR(16) NOT NULL,
    `receiver_username` VARCHAR(128) NOT NULL COMMENT 'The username of target user',
    `body` TEXT,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_updated_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `type_index` (`type`),
    INDEX `receiver_username_index` (`receiver_username`),
    INDEX `is_read_index` (`is_read`)
);

/* Portfolio DB */
CREATE DATABASE IF NOT EXISTS portf;

CREATE TABLE IF NOT EXISTS portf.category (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(64) NOT NULL COMMENT 'The short, camelCase, code-like field based on the corresponding English name',
    `image_url` VARCHAR(2048),
    `created_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_name` (`name`)
);

CREATE TABLE IF NOT EXISTS portf.kit (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(64) NOT NULL,
    `version` VARCHAR(16),
    `description` TINYTEXT,
    `status` VARCHAR(16) NOT NULL,
    `author_username` VARCHAR(128) NOT NULL COMMENT 'The username of recipe creator',
    `recipe` TEXT NOT NULL,
    `energy` INT NOT NULL COMMENT 'Energy in kcal',
    `portion` INT NOT NULL COMMENT 'Suggested for how many people',
    `prep_time` INT NOT NULL COMMENT 'Average time to prepare and cook in minutes',
    `created_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_updated_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `status_index` (`status`),
    INDEX `author_username_index` (`author_username`),
    INDEX `energy_index` (`energy`),
    UNIQUE KEY `unique_name_version` (`name`, `version`)
);

CREATE TABLE IF NOT EXISTS portf.price (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `kit_id` INT NOT NULL,
    `value` DECIMAL(10,2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL COMMENT 'ISO 4217 code of currency',
    INDEX `kit_id_index` (`kit_id`),
    INDEX `value_index` (`value`),
    UNIQUE KEY `unique_kit_id_value_currency` (`kit_id`,`value`,`currency`),
    FOREIGN KEY (`kit_id`) REFERENCES portf.kit(`id`)
);

CREATE TABLE IF NOT EXISTS portf.ingredient (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category` VARCHAR(32) NOT NULL COMMENT 'The short, camelCase, code-like field based on the corresponding English name',
    `code` VARCHAR(16) NOT NULL COMMENT 'PLU Code for fresh fruit & vegetables',
    `size` VARCHAR(16),
    `name_en` VARCHAR(64) NOT NULL,
    `name_de` VARCHAR(64),
    `name_es` VARCHAR(64),
    `name_fr` VARCHAR(64),
    `name_tr` VARCHAR(64),
    `image_url` VARCHAR(2048),
    `unit` VARCHAR(16) COMMENT 'The applicable unit of ingredient like gram, piece, liter etc.',
    INDEX `name_en_index` (`name_en`),
    INDEX `name_de_index` (`name_de`),
    INDEX `name_es_index` (`name_es`),
    INDEX `name_fr_index` (`name_fr`),
    INDEX `name_tr_index` (`name_tr`),
    UNIQUE KEY `unique_code` (`code`)
);

CREATE TABLE IF NOT EXISTS portf.kit_category_rel (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `kit_id` INT NOT NULL,
    INDEX `category_id_index` (`category_id`),
    INDEX `kit_id_index` (`kit_id`),
    UNIQUE KEY `unique_category_kit_ids` (`category_id`,`kit_id`),
    FOREIGN KEY (`category_id`) REFERENCES portf.category(`id`),
    FOREIGN KEY (`kit_id`) REFERENCES portf.kit(`id`)
);

CREATE TABLE IF NOT EXISTS portf.kit_ingredient_rel (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `kit_id` INT NOT NULL,
    `ingredient_id` INT NOT NULL,
    `quantity` DECIMAL(10,2),
    INDEX `kit_id_index` (`kit_id`),
    INDEX `ingredient_id_index` (`ingredient_id`),
    UNIQUE KEY `unique_kit_ingredient_ids` (`kit_id`,`ingredient_id`),
    FOREIGN KEY (`kit_id`) REFERENCES portf.kit(`id`),
    FOREIGN KEY (`ingredient_id`) REFERENCES portf.price(`id`)
);

/* User Interactions DB (Like, Comment, Comment, Flag) */
-- CREATE DATABASE IF NOT EXISTS uintr;

/* Warehouse DB */
-- CREATE DATABASE IF NOT EXISTS whs;

/* Order DB */
-- CREATE DATABASE IF NOT EXISTS order;

/* Delivery DB */
-- CREATE DATABASE IF NOT EXISTS deliv;


