import XCTest
import CoreData
@testable import PKUFoodDiary // Assuming your app module is named PKUFoodDiary

class CoreDataTests: XCTestCase {

    var mockPersistentContainer: NSPersistentContainer!

    override func setUpWithError() throws {
        try super.setUpWithError()
        mockPersistentContainer = createMockPersistentContainer()
    }

    override func tearDownWithError() throws {
        mockPersistentContainer = nil
        try super.tearDownWithError()
    }

    // Helper to create an in-memory persistent container
    func createMockPersistentContainer() -> NSPersistentContainer {
        let container = NSPersistentContainer(name: "PKUFoodDiary") // Use your model name
        let description = NSPersistentStoreDescription()
        description.type = NSInMemoryStoreType // In-memory store
        description.shouldAddStoreAsynchronously = false // Make it synchronous for testing
        container.persistentStoreDescriptions = [description]

        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error), \(error.userInfo) for in-memory store")
            }
        }
        return container
    }

    // MARK: - FoodItem Tests

    func testCreateAndFetchFoodItem() throws {
        let context = mockPersistentContainer.viewContext

        let foodName = "Test Food"
        let proteinGrams = 10.5
        let servingSize = "100g"
        let timestamp = Date()

        let foodItem = FoodItem(context: context)
        foodItem.name = foodName
        foodItem.proteinGrams = proteinGrams
        foodItem.servingSize = servingSize
        foodItem.timestamp = timestamp
        // Note: In the actual app, 'id' is not explicitly set for FoodItem.
        // If it were a required UUID, it would be: foodItem.id = UUID()

        try context.save()

        let fetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "name == %@", foodName)
        
        let fetchedItems = try context.fetch(fetchRequest)
        
        XCTAssertEqual(fetchedItems.count, 1, "Should fetch exactly one FoodItem.")
        let fetchedFoodItem = try XCTUnwrap(fetchedItems.first)
        
        XCTAssertEqual(fetchedFoodItem.name, foodName)
        XCTAssertEqual(fetchedFoodItem.proteinGrams, proteinGrams)
        XCTAssertEqual(fetchedFoodItem.servingSize, servingSize)
        XCTAssertEqual(fetchedFoodItem.timestamp, timestamp)
    }

    // MARK: - DailyLog and LoggedFoodItem Tests

    func testCreateDailyLogAndLoggedFoodItemRelationship() throws {
        let context = mockPersistentContainer.viewContext

        // 1. Create FoodItem
        let apple = FoodItem(context: context)
        apple.name = "Apple"
        apple.proteinGrams = 0.3
        apple.servingSize = "1 medium"
        apple.timestamp = Date()

        // 2. Create DailyLog
        let logDate = Calendar.current.startOfDay(for: Date())
        let dailyLog = DailyLog(context: context)
        dailyLog.date = logDate

        // 3. Create LoggedFoodItem
        let loggedApple = LoggedFoodItem(context: context)
        loggedApple.foodItem = apple
        loggedApple.quantity = 2.0 // Consumed 2 apples
        loggedApple.timestamp = Date() // Time of logging
        loggedApple.dailyLog = dailyLog // Associate with the DailyLog

        // Add to DailyLog's consumedItems (if not done automatically by setting inverse)
        // The generated NSManagedObject subclasses should handle this if relationships are set correctly.
        // dailyLog.addToConsumedItems(loggedApple) // This might be optional if inverse is set

        try context.save()

        // 4. Fetch DailyLog and assert
        let fetchLogRequest: NSFetchRequest<DailyLog> = DailyLog.fetchRequest()
        fetchLogRequest.predicate = NSPredicate(format: "date == %@", logDate as NSDate)
        
        let fetchedLogs = try context.fetch(fetchLogRequest)
        XCTAssertEqual(fetchedLogs.count, 1, "Should fetch one DailyLog for the date.")
        let fetchedLog = try XCTUnwrap(fetchedLogs.first)

        // Assert consumedItems
        let consumedItems = try XCTUnwrap(fetchedLog.consumedItems as? NSOrderedSet)
        XCTAssertEqual(consumedItems.count, 1, "DailyLog should have one consumed item.")
        
        let fetchedLoggedItem = try XCTUnwrap(consumedItems.firstObject as? LoggedFoodItem)
        XCTAssertEqual(fetchedLoggedItem.quantity, 2.0)
        XCTAssertEqual(fetchedLoggedItem.foodItem.name, "Apple")
        XCTAssertEqual(fetchedLoggedItem.dailyLog, fetchedLog, "LoggedItem should link back to the correct DailyLog.")
        XCTAssertEqual(fetchedLoggedItem.foodItem, apple, "LoggedItem should link to the correct FoodItem.")
    }

    // MARK: - UserProfile Tests

    func testCreateAndFetchUserProfile() throws {
        let context = mockPersistentContainer.viewContext
        let profileID = UUID()
        let initialProteinLimit = 120.0

        let userProfile = UserProfile(context: context)
        userProfile.id = profileID
        userProfile.dailyProteinLimit = initialProteinLimit

        try context.save()

        let fetchRequest: NSFetchRequest<UserProfile> = UserProfile.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", profileID as CVarArg)
        
        let fetchedProfiles = try context.fetch(fetchRequest)
        XCTAssertEqual(fetchedProfiles.count, 1, "Should fetch one UserProfile.")
        let fetchedProfile = try XCTUnwrap(fetchedProfiles.first)

        XCTAssertEqual(fetchedProfile.id, profileID)
        XCTAssertEqual(fetchedProfile.dailyProteinLimit, initialProteinLimit)
    }

    func testUpdateUserProfileProteinLimit() throws {
        let context = mockPersistentContainer.viewContext
        let profileID = UUID()
        let initialProteinLimit = 100.0
        let updatedProteinLimit = 150.5

        // Create initial profile
        let userProfile = UserProfile(context: context)
        userProfile.id = profileID
        userProfile.dailyProteinLimit = initialProteinLimit
        try context.save()

        // Fetch and update
        let fetchRequest: NSFetchRequest<UserProfile> = UserProfile.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", profileID as CVarArg)
        let profileToUpdate = try XCTUnwrap(context.fetch(fetchRequest).first)
        
        profileToUpdate.dailyProteinLimit = updatedProteinLimit
        try context.save()

        // Fetch again and verify
        let fetchedAgain = try XCTUnwrap(context.fetch(fetchRequest).first)
        XCTAssertEqual(fetchedAgain.dailyProteinLimit, updatedProteinLimit)
    }
}
