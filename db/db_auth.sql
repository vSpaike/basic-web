-- MySQL initialization SQL for db_auth

-- Create user and grant privileges
CREATE USER IF NOT EXISTS 'devuser'@'%' IDENTIFIED BY 'devpassword';
GRANT ALL PRIVILEGES ON db_auth.* TO 'devuser'@'%';
GRANT ALL PRIVILEGES ON db_auth.* TO 'root'@'%';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS `clients` (
  `nom` VARCHAR(64) NOT NULL,
  `prenom` VARCHAR(64) NOT NULL,
  `email` VARCHAR(256) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  `profile_image` VARCHAR(512) DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `objets` (
  `objet` VARCHAR(255) NOT NULL,
  `prix` DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`objet`, `prix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `groupes` (
  `groupe_id` INT AUTO_INCREMENT PRIMARY KEY,
  `nom_groupe` VARCHAR(255) NOT NULL UNIQUE,
  `createur_email` VARCHAR(256) NOT NULL,
  `date_creation` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`createur_email`) REFERENCES `clients`(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `members_groups` (
  `membre_id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupe_id` INT NOT NULL,
  `email` VARCHAR(256) NOT NULL,
  `date_join` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_member_per_group` (`groupe_id`, `email`),
  FOREIGN KEY (`groupe_id`) REFERENCES `groupes`(`groupe_id`) ON DELETE CASCADE,
  FOREIGN KEY (`email`) REFERENCES `clients`(`email`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `panier_groupe` (
  `panier_id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupe_id` INT NOT NULL,
  `objet` VARCHAR(255) NOT NULL,
  `prix` DECIMAL(10,2) NOT NULL,
  `quantite` INT DEFAULT 1,
  `date_ajout` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`groupe_id`) REFERENCES `groupes`(`groupe_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert User
INSERT INTO `clients` (`nom`,`prenom`,`email`,`password`) VALUES ('user','un','user1@demo.fr','user1@demo.fr');
INSERT INTO `clients` (`nom`,`prenom`,`email`,`password`) VALUES ('user','deux','user2@demo.fr','user2@demo.fr');