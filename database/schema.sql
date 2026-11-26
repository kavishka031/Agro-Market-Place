CREATE DATABASE IF NOT EXISTS aswanna_direct;
USE aswanna_direct;

-- 1. දිස්ත්‍රික්ක 25 වගුව (Districts Table)
CREATE TABLE districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_si VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL
);

-- 2. පරිශීලකයින් (Farmers & Consumers/Vendors)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('FARMER', 'CONSUMER', 'VENDOR') NOT NULL,
    district_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (district_id) REFERENCES districts(id)
);

-- 3. බෝග තොග වගුව (Crop Listings - Statechart States ඇතුළත්ව)
CREATE TABLE crop_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    district_id INT NOT NULL,
    category ENUM('PADDY', 'VEGETABLE', 'FRUIT') NOT NULL,
    crop_name VARCHAR(150) NOT NULL,
    farm_price DECIMAL(10, 2) NOT NULL,
    market_price DECIMAL(10, 2) NOT NULL,
    available_qty_kg DECIMAL(10, 2) NOT NULL,
    harvest_date DATE NOT NULL,
    status ENUM('PRE_HARVEST', 'SURPLUS_BULK', 'HARVESTED_READY', 'SOLD_OUT') DEFAULT 'PRE_HARVEST',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id),
    FOREIGN KEY (district_id) REFERENCES districts(id)
);

-- 4. පෙර-ඇණවුම් වගුව (Pre-Orders - State Diagram States ඇතුළත්ව)
CREATE TABLE pre_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    buyer_id INT NOT NULL,
    quantity_kg DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    order_status ENUM('ORDER_CREATED', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') DEFAULT 'ORDER_CREATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES crop_listings(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);

-- ශ්‍රී ලංකාවේ දිස්ත්‍රික්ක 25 ඇතුළත් කිරීම
INSERT INTO districts (name_si, name_en, province) VALUES
('කොළඹ', 'Colombo', 'බස්නාහිර'), ('ගම්පහ', 'Gampaha', 'බස්නාහිර'), ('කළුතර', 'Kalutara', 'බස්නාහිර'),
('මහනුවර', 'Kandy', 'මධ්‍යම'), ('මාතලේ', 'Matale', 'මධ්‍යම'), ('නුවරඑළිය', 'Nuwara Eliya', 'මධ්‍යම'),
('ගාල්ල', 'Galle', 'දකුණ'), ('මාතර', 'Matara', 'දකුණ'), ('හම්බන්තොට', 'Hambantota', 'දකුණ'),
('යාපනය', 'Jaffna', 'උතුර'), ('කිලිනොච්චිය', 'Kilinochchi', 'උතුර'), ('මන්නාරම', 'Mannar', 'උතුර'),
('වවුනියාව', 'Vavuniya', 'උතුර'), ('මුලතිව්', 'Mullaitivu', 'උතුර'),
('මඩකලපුව', 'Batticaloa', 'නැගෙනහිර'), ('අම්පාර', 'Ampara', 'නැගෙනහිර'), ('ත්‍රිකුණාමලය', 'Trincomalee', 'නැගෙනහිර'),
('කුරුණෑගල', 'Kurunegala', 'වයඹ'), ('පුත්තලම', 'Puttalam', 'වයඹ'),
('අනුරාධපුරය', 'Anuradhapura', 'උතුරු මැද'), ('පොළොන්නරුව', 'Polonnaruwa', 'උතුරු මැද'),
('බදුල්ල', 'Badulla', 'ඌව'), ('මොණරාගල', 'Monaragala', 'ඌව'),
('රත්නපුර', 'Ratnapura', 'සබරගමුව'), ('කෑගල්ල', 'Kegalle', 'සබරගමුව');

-- ආදර්ශ පරිශීලකයින් (Sample Farmer & Buyer)
INSERT INTO users (full_name, phone, role, district_id) VALUES
('සුනිල් බණ්ඩාර (ගොවි මහතා)', '0771234567', 'FARMER', 21),
('කවිශ්ක උමේෂ් (පාරිභෝගික)', '0719876543', 'CONSUMER', 1);

-- ආදර්ශ වී සහ එළවළු තොග (Sample Paddy & Crops)
INSERT INTO crop_listings (farmer_id, district_id, category, crop_name, farm_price, market_price, available_qty_kg, harvest_date, status) VALUES
(1, 21, 'PADDY', 'කීරි සම්බා වී (Keeri Samba Paddy)', 135.00, 175.00, 2500.00, '2026-12-10', 'PRE_HARVEST'),
(1, 16, 'PADDY', 'නාඩු වී (Nadu Paddy)', 115.00, 150.00, 4000.00, '2026-12-05', 'PRE_HARVEST'),
(1, 6, 'VEGETABLE', 'උඩරට කැරට් (Upcountry Carrots)', 240.00, 380.00, 600.00, '2026-11-30', 'SURPLUS_BULK');