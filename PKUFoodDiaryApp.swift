import SwiftUI

@main
struct PKUFoodDiaryApp: App {
    let persistenceController = PersistenceController.shared

    init() {
        // Seed default food items on app initialization
        DataSeeder.seedDefaultFoodItems(context: persistenceController.container.viewContext)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
