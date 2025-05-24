import CoreData

struct PersistenceController {
    static let shared = PersistenceController()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        // Use "PKUFoodDiary" as the model name
        container = NSPersistentContainer(name: "PKUFoodDiary") 
        if inMemory {
            container.persistentStoreDescriptions.first!.url = URL(fileURLWithPath: "/dev/null")
        }
        container.loadPersistentStores(completionHandler: { (storeDescription, error) in
            if let error = error as NSError? {
                // Replace this implementation with code to handle the error appropriately.
                // fatalError() causes the application to generate a crash log and terminate.
                // You should not use this function in a shipping application, although it may be useful during development.
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        })
        container.viewContext.automaticallyMergesChangesFromParent = true
    }

    // Static preview controller for SwiftUI Previews with sample data
    static var preview: PersistenceController = {
        let result = PersistenceController(inMemory: true)
        let viewContext = result.container.viewContext
        
        // Seed UserProfile for previews if needed by any view directly
        let userProfile = UserProfile(context: viewContext)
        userProfile.id = UUID()
        userProfile.dailyProteinLimit = 150.0

        // Seed default food items for previews
        DataSeeder.seedDefaultFoodItems(context: viewContext)
        
        // Create a sample DailyLog for today
        let todayLog = DailyLog(context: viewContext)
        todayLog.date = Calendar.current.startOfDay(for: Date())

        // Fetch some seeded food items to log
        let fetchFoodRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        fetchFoodRequest.fetchLimit = 2
        
        var foodToLog: [FoodItem] = []
        do {
            foodToLog = try viewContext.fetch(fetchFoodRequest)
        } catch {
            // print("Error fetching food for preview log: \(error)")
        }

        if let food1 = foodToLog.first {
            let loggedItem1 = LoggedFoodItem(context: viewContext)
            loggedItem1.foodItem = food1
            loggedItem1.quantity = 1.0
            loggedItem1.timestamp = Date()
            loggedItem1.dailyLog = todayLog
            todayLog.addToConsumedItems(loggedItem1)
        }
        
        if foodToLog.count > 1, let food2 = foodToLog.last {
             let loggedItem2 = LoggedFoodItem(context: viewContext)
             loggedItem2.foodItem = food2
             loggedItem2.quantity = 0.5
             loggedItem2.timestamp = Date(timeIntervalSinceNow: -3600) // An hour ago
             loggedItem2.dailyLog = todayLog
             todayLog.addToConsumedItems(loggedItem2)
        }

        do {
            try viewContext.save()
        } catch {
            let nsError = error as NSError
            fatalError("Unresolved error \(nsError), \(nsError.userInfo) for preview setup")
        }
        return result
    }()
}
