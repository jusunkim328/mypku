import XCTest
import CoreData
@testable import PKUFoodDiary

class ManualFoodEntryLogicTests: XCTestCase {

    var mockPersistentContainer: NSPersistentContainer!
    var viewContext: NSManagedObjectContext!

    override func setUpWithError() throws {
        try super.setUpWithError()
        mockPersistentContainer = createMockPersistentContainer()
        viewContext = mockPersistentContainer.viewContext
    }

    override func tearDownWithError() throws {
        viewContext = nil
        mockPersistentContainer = nil
        try super.tearDownWithError()
    }

    func createMockPersistentContainer() -> NSPersistentContainer {
        let container = NSPersistentContainer(name: "PKUFoodDiary")
        let description = NSPersistentStoreDescription()
        description.type = NSInMemoryStoreType
        container.persistentStoreDescriptions = [description]
        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        }
        return container
    }

    // Helper to pre-populate a FoodItem
    @discardableResult
    func createFoodItemInContext(name: String, proteinGrams: Double, servingSize: String) throws -> FoodItem {
        let foodItem = FoodItem(context: viewContext)
        foodItem.name = name
        foodItem.proteinGrams = proteinGrams
        foodItem.servingSize = servingSize
        foodItem.timestamp = Date()
        try viewContext.save()
        return foodItem
    }

    // This function simulates the core logic of finding or creating a FoodItem
    // as seen in ManualFoodEntryView and AIFoodRecognitionView.
    func findOrCreateFoodItem(name: String, proteinGrams: Double, servingSize: String, context: NSManagedObjectContext) throws -> FoodItem {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        // Using case-insensitive comparison as is often desired for user input
        fetchRequest.predicate = NSPredicate(format: "name ==[c] %@", trimmedName) 

        var foodItemToReturn: FoodItem?
        
        let results = try context.fetch(fetchRequest)
        if let existingFoodItem = results.first {
            foodItemToReturn = existingFoodItem
        } else {
            let newFoodItem = FoodItem(context: context)
            newFoodItem.name = trimmedName
            newFoodItem.proteinGrams = proteinGrams
            newFoodItem.servingSize = servingSize.trimmingCharacters(in: .whitespacesAndNewlines)
            newFoodItem.timestamp = Date()
            foodItemToReturn = newFoodItem
        }
        
        // The actual views also save the context here if a new item is created or if any modification happens.
        // For this test, we might save outside or ensure the test checks this.
        // For simplicity, the function returns the item, and the test can save if it's asserting creation.
        return try XCTUnwrap(foodItemToReturn)
    }

    func testFindOrCreate_WhenFoodItemExists_CaseInsensitive() throws {
        // 1. Pre-populate an item
        let existingName = "Test Apple"
        let existingProtein = 5.0
        let existingServing = "1 medium"
        let existingFoodItem = try createFoodItemInContext(name: existingName, proteinGrams: existingProtein, servingSize: existingServing)

        // 2. Attempt to find/create with slightly different casing but same name
        let searchName = "test apple" // Different case
        let newProteinAttempt = 10.0 // Different protein, to see if it updates or uses existing
        let newServingAttempt = "1 large"
        
        let foundItem = try findOrCreateFoodItem(name: searchName, proteinGrams: newProteinAttempt, servingSize: newServingAttempt, context: viewContext)
        
        // 3. Assert that the existing item was found and not a new one created
        XCTAssertEqual(foundItem.objectID, existingFoodItem.objectID, "Should have found the existing FoodItem.")
        XCTAssertEqual(foundItem.name, existingName, "Name should match the originally cased name in DB.") // Or normalized name, depending on design
        XCTAssertEqual(foundItem.proteinGrams, existingProtein, "Protein should be from the existing item, not the new attempt.")
        XCTAssertEqual(foundItem.servingSize, existingServing, "Serving size should be from the existing item.")

        // 4. Ensure no new items were added
        let fetchRequestAll: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        let count = try viewContext.count(for: fetchRequestAll)
        XCTAssertEqual(count, 1, "No new FoodItem should have been created.")
    }

    func testFindOrCreate_WhenFoodItemDoesNotExist_CreatesNew() throws {
        // 1. Database is initially empty or has other items
        try createFoodItemInContext(name: "Some Other Fruit", proteinGrams: 1.0, servingSize: "1 piece")
        
        // 2. Attempt to find/create a new item
        let newName = "New Banana"
        let newProtein = 1.5
        let newServing = "1 large"
        
        let createdItem = try findOrCreateFoodItem(name: newName, proteinGrams: newProtein, servingSize: newServing, context: viewContext)
        try viewContext.save() // Save the context as the function itself doesn't force save

        // 3. Assert that a new item was created with the correct properties
        XCTAssertEqual(createdItem.name, newName)
        XCTAssertEqual(createdItem.proteinGrams, newProtein)
        XCTAssertEqual(createdItem.servingSize, newServing)

        // 4. Ensure the new item is persisted
        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "name == %@", newName)
        let results = try viewContext.fetch(fetchRequest)
        XCTAssertEqual(results.count, 1, "The new FoodItem was not correctly saved or fetched.")
        XCTAssertEqual(results.first?.proteinGrams, newProtein)
    }
    
    func testFindOrCreate_WithEmptyName_ShouldIdeallyBeHandledByValidation() throws {
        // The `findOrCreateFoodItem` function has `name.trimmingCharacters(in: .whitespacesAndNewlines)`
        // If the name becomes empty after trimming, current logic would create an item with an empty name.
        // UI-level validation should prevent this. Here, we test the function's behavior.
        
        let emptyName = "   "
        let protein = 1.0
        let serving = "1 serving"
        
        let item = try findOrCreateFoodItem(name: emptyName, proteinGrams: protein, servingSize: serving, context: viewContext)
        try viewContext.save()
        
        XCTAssertEqual(item.name, "", "Item name should be empty after trimming.")
        
        // Fetch to confirm it was saved with an empty name
        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "name == %@", "")
        let results = try viewContext.fetch(fetchRequest)
        XCTAssertEqual(results.count, 1, "FoodItem with empty name was not created/found.")
    }
    
    func testFindOrCreate_ExistingItem_TrimmingWhitespaceInSearch() throws {
        let existingName = "Clean Name"
        try createFoodItemInContext(name: existingName, proteinGrams: 5.0, servingSize: "100g")

        let searchNameWithWhitespace = "  Clean Name  "
        let item = try findOrCreateFoodItem(name: searchNameWithWhitespace, proteinGrams: 10.0, servingSize: "new serving", context: viewContext)
        
        XCTAssertEqual(item.name, existingName, "Should find existing item even with search term whitespace.")
        XCTAssertEqual(item.proteinGrams, 5.0, "Should use existing item's protein.")
        
        let fetchRequestAll: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        let count = try viewContext.count(for: fetchRequestAll)
        XCTAssertEqual(count, 1, "No new FoodItem should have been created.")
    }
}
