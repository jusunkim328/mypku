import XCTest
import CoreData
@testable import PKUFoodDiary

class ProteinCalculationTests: XCTestCase {

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

    // Helper function to create a FoodItem
    func createFoodItem(name: String, protein: Double, servingSize: String) -> FoodItem {
        let foodItem = FoodItem(context: viewContext)
        foodItem.name = name
        foodItem.proteinGrams = protein
        foodItem.servingSize = servingSize
        foodItem.timestamp = Date()
        return foodItem
    }

    // Helper function to create a LoggedFoodItem
    func createLoggedFoodItem(foodItem: FoodItem, quantity: Double, dailyLog: DailyLog) -> LoggedFoodItem {
        let loggedItem = LoggedFoodItem(context: viewContext)
        loggedItem.foodItem = foodItem
        loggedItem.quantity = quantity
        loggedItem.timestamp = Date()
        loggedItem.dailyLog = dailyLog
        return loggedItem
    }
    
    // This function mimics the logic in DailyLogView.totalProteinToday
    func calculateTotalProtein(for loggedItems: [LoggedFoodItem]) -> Double {
        return loggedItems.reduce(0) { $0 + ($1.foodItem.proteinGrams * $1.quantity) }
    }
    
    func calculateTotalProtein(for dailyLog: DailyLog?) -> Double {
        guard let log = dailyLog, let items = log.consumedItems as? Set<LoggedFoodItem> else {
            return 0.0
        }
        return items.reduce(0) { $0 + ($1.foodItem.proteinGrams * $1.quantity) }
    }


    func testTotalProtein_WithMultipleItemsAndQuantities() throws {
        let dailyLog = DailyLog(context: viewContext)
        dailyLog.date = Date()

        let chicken = createFoodItem(name: "Chicken", protein: 31.0, servingSize: "100g")
        let rice = createFoodItem(name: "Rice", protein: 2.5, servingSize: "100g")
        let broccoli = createFoodItem(name: "Broccoli", protein: 2.8, servingSize: "100g")

        _ = createLoggedFoodItem(foodItem: chicken, quantity: 1.5, dailyLog: dailyLog) // 31.0 * 1.5 = 46.5
        _ = createLoggedFoodItem(foodItem: rice, quantity: 2.0, dailyLog: dailyLog)    // 2.5 * 2.0 = 5.0
        _ = createLoggedFoodItem(foodItem: broccoli, quantity: 0.5, dailyLog: dailyLog) // 2.8 * 0.5 = 1.4
        
        try viewContext.save() // Save items to the log

        let totalProtein = calculateTotalProtein(for: dailyLog)
        XCTAssertEqual(totalProtein, 46.5 + 5.0 + 1.4, accuracy: 0.01, "Total protein calculation is incorrect.")
    }

    func testTotalProtein_WithSingleItem() throws {
        let dailyLog = DailyLog(context: viewContext)
        dailyLog.date = Date()
        
        let egg = createFoodItem(name: "Egg", protein: 6.0, servingSize: "1 large")
        _ = createLoggedFoodItem(foodItem: egg, quantity: 1.0, dailyLog: dailyLog) // 6.0 * 1.0 = 6.0
        
        try viewContext.save()

        let totalProtein = calculateTotalProtein(for: dailyLog)
        XCTAssertEqual(totalProtein, 6.0, accuracy: 0.01, "Total protein for single item is incorrect.")
    }
    
    func testTotalProtein_WithSingleItemMultipleQuantity() throws {
        let dailyLog = DailyLog(context: viewContext)
        dailyLog.date = Date()
        
        let proteinShake = createFoodItem(name: "Protein Shake", protein: 25.0, servingSize: "1 scoop")
        _ = createLoggedFoodItem(foodItem: proteinShake, quantity: 2.0, dailyLog: dailyLog) // 25.0 * 2.0 = 50.0
        
        try viewContext.save()

        let totalProtein = calculateTotalProtein(for: dailyLog)
        XCTAssertEqual(totalProtein, 50.0, accuracy: 0.01, "Total protein for single item with quantity > 1 is incorrect.")
    }

    func testTotalProtein_WithNoItems() throws {
        let dailyLog = DailyLog(context: viewContext) // Empty log
        dailyLog.date = Date()
        try viewContext.save()

        let totalProtein = calculateTotalProtein(for: dailyLog)
        XCTAssertEqual(totalProtein, 0.0, accuracy: 0.01, "Total protein for no items should be 0.")
    }
    
    func testTotalProtein_WithZeroQuantityItem() throws {
        let dailyLog = DailyLog(context: viewContext)
        dailyLog.date = Date()
        
        let almonds = createFoodItem(name: "Almonds", protein: 21.0, servingSize: "100g")
        _ = createLoggedFoodItem(foodItem: almonds, quantity: 0.0, dailyLog: dailyLog) // 21.0 * 0.0 = 0.0
        
        try viewContext.save()

        let totalProtein = calculateTotalProtein(for: dailyLog)
        XCTAssertEqual(totalProtein, 0.0, accuracy: 0.01, "Total protein for zero quantity item should be 0.")
    }
    
    func testTotalProtein_WithZeroProteinItem() throws {
        let dailyLog = DailyLog(context: viewContext)
        dailyLog.date = Date()
        
        let water = createFoodItem(name: "Water", protein: 0.0, servingSize: "250ml")
        _ = createLoggedFoodItem(foodItem: water, quantity: 3.0, dailyLog: dailyLog) // 0.0 * 3.0 = 0.0
        
        try viewContext.save()

        let totalProtein = calculateTotalProtein(for: dailyLog)
        XCTAssertEqual(totalProtein, 0.0, accuracy: 0.01, "Total protein for zero protein item should be 0.")
    }
}
