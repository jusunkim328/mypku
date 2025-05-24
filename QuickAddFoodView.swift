import SwiftUI
import CoreData

struct QuickAddFoodView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @Environment(\.dismiss) var dismiss

    var currentDate: Date

    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \FoodItem.name, ascending: true)],
        animation: .default)
    private var foodItems: FetchedResults<FoodItem>

    @State private var searchText: String = ""
    @State private var selectedFoodItem: FoodItem? = nil
    @State private var showingQuantityAlert = false
    @State private var quantityInput: String = "1"
    
    @State private var showingErrorAlert = false
    @State private var errorMessage = ""

    var filteredFoodItems: [FoodItem] {
        if searchText.isEmpty {
            return Array(foodItems)
        } else {
            return foodItems.filter { $0.name.lowercased().contains(searchText.lowercased()) }
        }
    }

    var body: some View {
        NavigationView {
            VStack {
                TextField("Search food...", text: $searchText)
                    .padding()
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                List {
                    ForEach(filteredFoodItems, id: \.self) { item in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(item.name)
                                    .font(.headline)
                                Text("Protein: \(item.proteinGrams, specifier: "%.1f")g per \(item.servingSize ?? "serving")")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }
                        .contentShape(Rectangle()) // Make entire row tappable
                        .onTapGesture {
                            self.selectedFoodItem = item
                            self.quantityInput = "1" // Reset quantity for new selection
                            self.showingQuantityAlert = true
                        }
                    }
                }
            }
            .navigationTitle("Quick Add Food")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Enter Quantity", isPresented: $showingQuantityAlert, actions: {
                TextField("Quantity (e.g., 1.5)", text: $quantityInput)
                    .keyboardType(.decimalPad)
                Button("Log Food") {
                    logSelectedFood()
                }
                Button("Cancel", role: .cancel) {}
            }, message: {
                Text("How many servings of \(selectedFoodItem?.name ?? "this food") did you have?")
            })
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func logSelectedFood() {
        guard let foodToLog = selectedFoodItem else {
            errorMessage = "No food item selected."
            showingErrorAlert = true
            return
        }
        
        guard let quantity = Double(quantityInput), quantity > 0 else {
            errorMessage = "Please enter a valid quantity greater than 0."
            // Keep quantity alert showing or re-trigger if possible,
            // for now, just show error and user has to tap again.
            // A more robust solution would be a custom alert.
            showingErrorAlert = true
            return
        }

        // 1. Create LoggedFoodItem
        let newLoggedItem = LoggedFoodItem(context: viewContext)
        newLoggedItem.foodItem = foodToLog
        newLoggedItem.quantity = quantity
        newLoggedItem.timestamp = Date() // Logged time

        // 2. Find or Create DailyLog
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
            errorMessage = "Error fetching daily log: \(error.localizedDescription)"
            showingErrorAlert = true
            return
        }
        
        guard let finalDailyLog = currentDailyLog else {
            errorMessage = "Could not find or create DailyLog."
            showingErrorAlert = true
            return
        }

        // 3. Add LoggedFoodItem to DailyLog
        finalDailyLog.addToConsumedItems(newLoggedItem)

        // 4. Save context
        do {
            try viewContext.save()
            dismiss() // Dismiss the view on successful save
        } catch {
            let nsError = error as NSError
            errorMessage = "Failed to save to Core Data: \(nsError.localizedDescription), \(nsError.userInfo)"
            showingErrorAlert = true
        }
    }
}

struct QuickAddFoodView_Previews: PreviewProvider {
    static var previews: some View {
        // Use the same PersistenceController as in DailyLogView for consistency
        let persistenceController = PersistenceController(inMemory: true)
        let context = persistenceController.container.viewContext

        // Seed data for preview
        DataSeeder.seedDefaultFoodItems(context: context)
        
        // Mock UserProfile (optional, but good for full testing environment)
        let userProfile = UserProfile(context: context)
        userProfile.id = UUID()
        userProfile.dailyProteinLimit = 150.0
        
        do {
            try context.save() // Save profile and seeded items
        } catch {
            let nsError = error as NSError
            fatalError("Unresolved error \(nsError), \(nsError.userInfo) for preview")
        }

        return QuickAddFoodView(currentDate: Date())
            .environment(\.managedObjectContext, context)
    }
}

// If PersistenceController is not already globally available, include a minimal version for preview.
// Ensure this struct is defined if not already in another file within this target.
// struct PersistenceController {
//     let container: NSPersistentContainer
// 
//     init(inMemory: Bool = false) {
//         container = NSPersistentContainer(name: "YourAppName") // Replace YourAppName
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
