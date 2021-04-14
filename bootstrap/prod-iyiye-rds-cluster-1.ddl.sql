/* Notification DB (a.k.a notif) */

CREATE DATABASE IF NOT EXISTS notif; --Notification
CREATE TABLE IF NOT EXISTS notif.in_app_notifications (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `type` ENUM('announcement', 'promotion', 'report', 'comment', 'star', 'flag'),
    `receiver_username` VARCHAR(128) NOT NULL,
    `body` TEXT,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_updated_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `receiver_username_index` (receiver_username)
);

CREATE DATABASE IF NOT EXISTS order; --Order
CREATE DATABASE IF NOT EXISTS deliv; --Delivery
CREATE DATABASE IF NOT EXISTS kit; --Delivery

