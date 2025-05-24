import Foundation
import CoreData

public class DataSeeder {

    public static func seedDefaultFoodItems(context: NSManagedObjectContext) {
        // Check if FoodItems already exist
        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        
        do {
            let existingFoodItemsCount = try context.count(for: fetchRequest)
            if existingFoodItemsCount > 0 {
                print("Default food items already exist. Skipping seeding.")
                return
            }
        } catch {
            print("Error checking for existing food items: \(error.localizedDescription)")
            // Proceed with caution, or perhaps return to avoid duplicate entries if count fails
            return
        }

        print("Seeding default food items...")

        let foodItemsToSeed: [(name: String, proteinGrams: Double, servingSize: String)] = [
            ("Chicken Breast", 25.0, "100g serving"),
            ("Egg", 6.0, "1 large egg"),
            ("Tofu", 8.0, "100g serving"),
            ("Salmon Fillet", 20.0, "100g serving"),
            ("Lentils", 9.0, "100g cooked serving"),
            ("Greek Yogurt", 10.0, "100g serving"),
            ("Almonds", 21.0, "100g serving"),
            ("Protein Powder (Whey)", 24.0, "1 scoop (approx 30g)"),
            ("Cottage Cheese", 11.0, "100g serving"),
            ("Tuna (canned in water)", 22.0, "100g serving")
        ]

        for foodData in foodItemsToSeed {
            let foodItem = FoodItem(context: context)
            foodItem.name = foodData.name
            foodItem.proteinGrams = foodData.proteinGrams
            foodItem.servingSize = foodData.servingSize
            foodItem.timestamp = Date() // Represents creation/last update date of the food item itself
        }

        do {
            try context.save()
            print("Default food items seeded successfully.")
        } catch {
            let nsError = error as NSError
            print("Error saving seeded food items: \(nsError.localizedDescription), \(nsError.userInfo)")
            // Consider how to handle this error in a real app
        }
    }
}
