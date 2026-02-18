-- MySQL initialization SQL for db_auth

CREATE TABLE IF NOT EXISTS `clients` (
  `nom` VARCHAR(64) NOT NULL,
  `prenom` VARCHAR(64) NOT NULL,
  `email` VARCHAR(256) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `objets` (
  `objet` VARCHAR(255) NOT NULL,
  `prix` DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`objet`, `prix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Example data
INSERT INTO `objets` (`objet`, `prix`) VALUES ('apple', 10.00);

-- Insert User
INSERT INTO `clients` (`nom`,`prenom`,`email`,`password`) VALUES ('user','un','user1@demo.fr','user1@demo.fr');
INSERT INTO `clients` (`nom`,`prenom`,`email`,`password`) VALUES ('user','deux','user2@demo.fr','user2@demo.fr');