import SwiftUI
import CoreData

struct ManualFoodEntryView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @Environment(\.dismiss) var dismiss

    var currentDate: Date

    @State private var foodName: String = ""
    @State private var proteinGrams: String = ""
    @State private var servingSize: String = ""
    @State private var quantity: String = "1"

    @State private var showingAlert = false
    @State private var alertMessage = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Food Details")) {
                    TextField("Food Name (e.g., Chicken Breast)", text: $foodName)
                    TextField("Protein per Serving (grams)", text: $proteinGrams)
                        .keyboardType(.decimalPad)
                    TextField("Serving Size (e.g., 100g, 1 cup) (Optional)", text: $servingSize)
                    TextField("Quantity", text: $quantity)
                        .keyboardType(.decimalPad)
                }

                Section {
                    Button("Save Food and Log") {
                        saveFoodAndLog()
                    }
                }
            }
            .navigationTitle("Log New Food")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert(isPresented: $showingAlert) {
                Alert(title: Text("Input Error"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
            }
        }
    }

    private func validateInputs() -> (Double, Double)? {
        guard !foodName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            alertMessage = "Food name cannot be empty."
            showingAlert = true
            return nil
        }
        guard let protein = Double(proteinGrams), protein >= 0 else {
            alertMessage = "Protein grams must be a valid non-negative number."
            showingAlert = true
            return nil
        }
        guard let qty = Double(quantity), qty > 0 else {
            alertMessage = "Quantity must be a valid positive number."
            showingAlert = true
            return nil
        }
        return (protein, qty)
    }

    private func saveFoodAndLog() {
        guard let (proteinValue, quantityValue) = validateInputs() else {
            return
        }

        // 1. Find or Create FoodItem
        let foodItemFetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        foodItemFetchRequest.predicate = NSPredicate(format: "name ==[c] %@", foodName.trimmingCharacters(in: .whitespacesAndNewlines))

        var currentFoodItem: FoodItem?
        do {
            let results = try viewContext.fetch(foodItemFetchRequest)
            currentFoodItem = results.first

            if currentFoodItem == nil {
                // Create new FoodItem
                currentFoodItem = FoodItem(context: viewContext)
                currentFoodItem?.name = foodName.trimmingCharacters(in: .whitespacesAndNewlines)
                currentFoodItem?.proteinGrams = proteinValue
                currentFoodItem?.servingSize = servingSize.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : servingSize.trimmingCharacters(in: .whitespacesAndNewlines)
                currentFoodItem?.timestamp = Date() // Or a fixed date if items are meant to be timeless
            } else {
                // Optionally update existing FoodItem if details are different,
                // or decide if that's the desired behavior.
                // For now, we use it as is.
            }
        } catch {
            alertMessage = "Error fetching food item: \(error.localizedDescription)"
            showingAlert = true
            return
        }
        
        guard let finalFoodItem = currentFoodItem else {
            alertMessage = "Could not find or create FoodItem."
            showingAlert = true
            return
        }

        // 2. Create LoggedFoodItem
        let newLoggedItem = LoggedFoodItem(context: viewContext)
        newLoggedItem.foodItem = finalFoodItem
        newLoggedItem.quantity = quantityValue
        newLoggedItem.timestamp = Date() // Logged time

        // 3. Find or Create DailyLog
        let calendar = Calendar.current
        let startOfCurrentDate = calendar.startOfDay(for: currentDate)
        let endOfCurrentDate = calendar.date(byAdding: .day, value: 1, to: startOfCurrentDate)!

        let dailyLogFetchRequest: NSFetchRequest<DailyLog> = DailyLog.fetchRequest()
        dailyLogFetchRequest.predicate = NSPredicate(format: "date >= %@ AND date < %@", startOfCurrentDate as NSDate, endOfCurrentDate as NSDate)

        var currentDailyLog: DailyLog?
        do {
            let logs = try viewContext.fetch(dailyLogFetchRequest)
            currentDailyLog = logs.first

            if currentDailyLog == nil {
                currentDailyLog = DailyLog(context: viewContext)
                currentDailyLog?.date = startOfCurrentDate
            }
        } catch {
            alertMessage = "Error fetching daily log: \(error.localizedDescription)"
            showingAlert = true
            return
        }
        
        guard let finalDailyLog = currentDailyLog else {
            alertMessage = "Could not find or create DailyLog."
            showingAlert = true
            return
        }

        // 4. Add LoggedFoodItem to DailyLog
        finalDailyLog.addToConsumedItems(newLoggedItem) // This is an NSOrderedSet, so just add.

        // 5. Save context
        do {
            try viewContext.save()
            dismiss() // Dismiss the view on successful save
        } catch {
            let nsError = error as NSError
            alertMessage = "Failed to save to Core Data: \(nsError.localizedDescription), \(nsError.userInfo)"
            showingAlert = true
        }
    }
}

struct ManualFoodEntryView_Previews: PreviewProvider {
    static var previews: some View {
        // Use the same PersistenceController as in DailyLogView for consistency
        let persistenceController = PersistenceController(inMemory: true)
        let context = persistenceController.container.viewContext

        // Mock UserProfile (optional, but good for full testing environment)
        let userProfile = UserProfile(context: context)
        userProfile.id = UUID()
        userProfile.dailyProteinLimit = 150.0

        // Pre-populate with an existing food item for testing "existing item" logic
        let existingFood = FoodItem(context: context)
        existingFood.name = "Generic Protein Powder"
        existingFood.proteinGrams = 24.0
        existingFood.servingSize = "1 scoop"
        existingFood.timestamp = Date()
        
        do {
            try context.save()
        } catch {
            // Handle error
        }

        return ManualFoodEntryView(currentDate: Date())
            .environment(\.managedObjectContext, context)
    }
}

// If PersistenceController is not already globally available, include a minimal version for preview.
// Ensure this struct is defined if not already in another file within this target.
// struct PersistenceController {
//     let container: NSPersistentContainer
// 
//     init(inMemory: Bool = false) {
//         container = NSPersistentContainer(name: "YourAppName") // Replace YourAppName with your actual data model name
//         if inMemory {
//             container.persistentStoreDescriptions.first!.url = URL(fileURLWithPath: "/dev/null")
//         }
//         container.loadPersistentStores(completionHandler: { (storeDescription, error) in
//             if let error = error as NSError? {
//                 fatalError("Unresolved error \(error), \(error.userInfo)")
//             }
//         })
//         container.viewContext.automaticallyMergesChangesFromParent = true
//     }
// }
