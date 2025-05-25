import XCTest
import CoreData
@testable import PKUFoodDiary

class DataSeederTests: XCTestCase {

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

    func fetchFoodItemCount() -> Int {
        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        do {
            return try viewContext.count(for: fetchRequest)
        } catch {
            XCTFail("Failed to fetch FoodItem count: \(error.localizedDescription)")
            return -1 // Should not happen if setup is correct
        }
    }
    
    func createSampleFoodItem(name: String) {
        let foodItem = FoodItem(context: viewContext)
        foodItem.name = name
        foodItem.proteinGrams = 1.0 // Dummy value
        foodItem.servingSize = "unit" // Dummy value
        foodItem.timestamp = Date()
        try? viewContext.save()
    }

    func testSeedDefaultFoodItems_WhenDatabaseIsEmpty() throws {
        // 1. Ensure database is empty
        XCTAssertEqual(fetchFoodItemCount(), 0, "Database should be empty before seeding.")

        // 2. Call the seeder
        DataSeeder.seedDefaultFoodItems(context: viewContext)

        // 3. Assert that items were added
        // The seeder adds 10 default items.
        let expectedItemCount = 10 
        XCTAssertEqual(fetchFoodItemCount(), expectedItemCount, "Seeder did not add the expected number of food items.")
        
        // Optionally, fetch one known item to verify its presence
        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "name == %@", "Chicken Breast") // One of the seeded items
        let results = try viewContext.fetch(fetchRequest)
        XCTAssertEqual(results.count, 1, "Specific default food item 'Chicken Breast' was not found after seeding.")
    }

    func testSeedDefaultFoodItems_WhenItemsAlreadyExist() throws {
        // 1. Pre-populate the database with some FoodItems
        createSampleFoodItem(name: "Existing Item 1")
        createSampleFoodItem(name: "Existing Item 2")
        
        let initialCount = fetchFoodItemCount()
        XCTAssertTrue(initialCount > 0, "Database should have items before testing non-duplication.")

        // 2. Call the seeder
        DataSeeder.seedDefaultFoodItems(context: viewContext)

        // 3. Assert that no new items were added
        // The seeder should detect existing items and not add more.
        XCTAssertEqual(fetchFoodItemCount(), initialCount, "Seeder should not add more items if FoodItems already exist.")
    }
    
    func testSeedDefaultFoodItems_Twice_DoesNotDuplicate() throws {
        // 1. Ensure database is empty
        XCTAssertEqual(fetchFoodItemCount(), 0, "Database should be empty before first seeding.")

        // 2. Call the seeder first time
        DataSeeder.seedDefaultFoodItems(context: viewContext)
        let countAfterFirstSeed = fetchFoodItemCount()
        let expectedItemCount = 10
        XCTAssertEqual(countAfterFirstSeed, expectedItemCount, "Seeder did not add the expected number of items on first run.")

        // 3. Call the seeder second time
        DataSeeder.seedDefaultFoodItems(context: viewContext)
        
        // 4. Assert count remains the same
        XCTAssertEqual(fetchFoodItemCount(), countAfterFirstSeed, "Seeder added duplicate items on second run.")
    }
}
