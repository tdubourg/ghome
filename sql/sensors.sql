CREATE TABLE `sensors` (
  `id` INTEGER PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `sensor_type_id` VINTEGER NOT NULL,
   FOREIGN KEY(sensor_type_id) REFERENCES sensors_types(id)
);