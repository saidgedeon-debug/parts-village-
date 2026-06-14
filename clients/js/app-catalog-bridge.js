/**
 * Parts Village Catalog Bridge
 * Loads catalog data from localStorage for use in the Clients & Quotations module.
 */
window.PVCatalog = {
    items: [],
    
    load() {
        // Attempt to load from the main app's localStorage key
        const data = localStorage.getItem('pv_catalog_data');
        if (data) {
            try { 
                this.items = JSON.parse(data); 
            } catch(e) { 
                this.items = []; 
            }
        }
        // Fallback: if no catalog data, provide a sample set for demo/testing
        if (!this.items || this.items.length === 0) {
            this.items = this.getSampleCatalog();
        }
        return this.items;
    },
    
    getSampleCatalog() {
        // Return sample catalog items for demonstration purposes
        return [
            {
                item_code: "A01-1", 
                oem_part_number: "7861-93-2310", 
                product_name_en: "Revolution Sensor", 
                product_name_cn: "转速传感器",
                category: "Sensors",
                list_price: 45.00,
                main_image: "../images/placeholder-part.png",
                description: "Engine revolution sensor for heavy machinery"
            },
            {
                item_code: "A01-2", 
                oem_part_number: "7861-92-2310", 
                product_name_en: "Pressure Sensor", 
                product_name_cn: "压力传感器",
                category: "Sensors",
                list_price: 38.50,
                main_image: "../images/placeholder-part.png",
                description: "Hydraulic pressure sensor"
            },
            {
                item_code: "A02-1", 
                oem_part_number: "6217-81-9210", 
                product_name_en: "Fuel Injector", 
                product_name_cn: "喷油器",
                category: "Engine Parts",
                list_price: 125.00,
                main_image: "../images/placeholder-part.png",
                description: "High performance fuel injector"
            },
            {
                item_code: "A02-2", 
                oem_part_number: "6218-11-1810", 
                product_name_en: "Piston Ring Set", 
                product_name_cn: "活塞环组",
                category: "Engine Parts",
                list_price: 78.00,
                main_image: "../images/placeholder-part.png",
                description: "Complete piston ring set"
            },
            {
                item_code: "B01-1", 
                oem_part_number: "207-27-51311", 
                product_name_en: "Hydraulic Pump", 
                product_name_cn: "液压泵",
                category: "Hydraulic",
                list_price: 890.00,
                main_image: "../images/placeholder-part.png",
                description: "Main hydraulic pump assembly"
            },
            {
                item_code: "B01-2", 
                oem_part_number: "207-27-51312", 
                product_name_en: "Hydraulic Valve", 
                product_name_cn: "液压阀",
                category: "Hydraulic",
                list_price: 245.00,
                main_image: "../images/placeholder-part.png",
                description: "Control valve for hydraulic system"
            },
            {
                item_code: "C01-1", 
                oem_part_number: "600-311-8221", 
                product_name_en: "Oil Filter", 
                product_name_cn: "机油滤清器",
                category: "Filters",
                list_price: 18.50,
                main_image: "../images/placeholder-part.png",
                description: "High efficiency oil filter"
            },
            {
                item_code: "C01-2", 
                oem_part_number: "600-211-2110", 
                product_name_en: "Fuel Filter", 
                product_name_cn: "燃油滤清器",
                category: "Filters",
                list_price: 22.00,
                main_image: "../images/placeholder-part.png",
                description: "Primary fuel filter element"
            },
            {
                item_code: "D01-1", 
                oem_part_number: "208-27-71112", 
                product_name_en: "Track Roller", 
                product_name_cn: "支重轮",
                category: "Undercarriage",
                list_price: 156.00,
                main_image: "../images/placeholder-part.png",
                description: "Track roller for excavator"
            },
            {
                item_code: "D01-2", 
                oem_part_number: "208-27-71113", 
                product_name_en: "Idler Roller", 
                product_name_cn: "引导轮",
                category: "Undercarriage",
                list_price: 210.00,
                main_image: "../images/placeholder-part.png",
                description: "Front idler roller assembly"
            }
        ];
    }
};

// Auto-load catalog on script load
window.PVCatalog.load();
