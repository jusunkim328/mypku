import SwiftUI
import CoreData

struct AIFoodRecognitionView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @Environment(\.dismiss) var dismiss

    var currentDate: Date

    // UI State
    @State internal var isSimulating: Bool = false
    @State internal var showResultsSection: Bool = false
    @State internal var simulationAttempted: Bool = false // To know if we should show "try again" or initial prompt

    // AI Suggested Data (will be editable)
    @State internal var foodName: String = ""
    @State internal var proteinGrams: String = ""
    @State internal var servingSize: String = ""
    @State internal var quantity: String = "1"

    // Error Handling
    @State internal var errorMessage: String? = nil
    @State private var showingErrorAlert: Bool = false // This should remain private
    
    // To differentiate between first load and subsequent "try again"
    @State internal var userInitiatedSimulation: Bool = false


    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if isSimulating {
                    ProgressView("Analyzing Food...")
                        .padding()
                } else if showResultsSection {
                    // Results and Editing Form
                    Form {
                        Section(header: Text("AI Suggestion (Editable)")) {
                            TextField("Food Name", text: $foodName)
                            TextField("Protein per Serving (grams)", text: $proteinGrams)
                                .keyboardType(.decimalPad)
                            TextField("Serving Size (e.g., 100g)", text: $servingSize)
                            TextField("Quantity", text: $quantity)
                                .keyboardType(.decimalPad)
                        }
                        
                        Section {
                            Button("Log Food") {
                                logFood()
                            }
                        }
                        
                        Section {
                            Button("Try AI Scan Again") {
                                // Reset suggestions and trigger simulation
                                resetSuggestions()
                                userInitiatedSimulation = true
                                simulateAIAnalysis()
                            }
                            .foregroundColor(.orange)
                        }
                    }
                } else {
                    // Initial State or Post-Failure State
                    Text(simulationAttempted ? (errorMessage ?? "Ready to try again?") : "Use AI to identify your food by taking a photo or selecting from your library.")
                        .multilineTextAlignment(.center)
                        .padding()

                    Button("Take Photo (Simulated)") {
                        userInitiatedSimulation = true
                        simulateAIAnalysis()
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Select from Library (Simulated)") {
                        userInitiatedSimulation = true
                        simulateAIAnalysis()
                    }
                    .buttonStyle(.bordered)
                    
                    if simulationAttempted && errorMessage != nil {
                        Text(errorMessage!)
                            .foregroundColor(.red)
                            .padding()
                    }
                }
                Spacer()
            }
            .navigationTitle("AI Food Recognition")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Input Error", isPresented: $showingErrorAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
            // Automatically run simulation if user initiated and no results yet
            .onAppear {
                 // Only run simulation if the user has explicitly tried to start it
                 // and we are not already showing results or simulating.
                 // This onAppear logic might be too aggressive or might need refinement
                 // depending on desired UX flow (e.g., if view can be re-appeared in a state
                 // where simulation should auto-retry). For now, keep it simple.
                 // If `userInitiatedSimulation` is true and we are not showing results,
                 // it implies a previous attempt might have failed or it's a fresh attempt.
                if userInitiatedSimulation && !showResultsSection && !isSimulating {
                    // simulateAIAnalysis() // Decided to make simulation explicit on button press
                }
            }
        }
    }
    
    private func resetSuggestions() {
        foodName = ""
        proteinGrams = ""
        servingSize = ""
        quantity = "1"
        errorMessage = nil
    }

    private func simulateAIAnalysis() {
        if !userInitiatedSimulation { return } // Don't simulate on view load unless user clicked
        
        isSimulating = true
        showResultsSection = false
        simulationAttempted = true
        errorMessage = nil // Clear previous errors

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            isSimulating = false
            // Simulate success or failure randomly
            if Bool.random() {
                // Simulate success
                self.foodName = "AI: Banana"
                self.proteinGrams = "1.3"
                self.servingSize = "1 medium"
                self.quantity = "1"
                self.showResultsSection = true
            } else {
                // Simulate failure
                self.errorMessage = "AI could not identify the food. Please enter manually or try again."
                self.showResultsSection = false // Ensure form is hidden on failure
            }
        }
    }

    private func validateInputs() -> (name: String, protein: Double, serving: String, qty: Double)? {
        let trimmedFoodName = foodName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedFoodName.isEmpty else {
            self.errorMessage = "Food name cannot be empty."
            self.showingErrorAlert = true
            return nil
        }
        guard let proteinVal = Double(proteinGrams), proteinVal >= 0 else {
            self.errorMessage = "Protein grams must be a valid non-negative number."
            self.showingErrorAlert = true
            return nil
        }
        let trimmedServingSize = servingSize.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedServingSize.isEmpty else {
            self.errorMessage = "Serving size cannot be empty. (e.g., 100g, 1 cup)"
            self.showingErrorAlert = true
            return nil
        }
        guard let quantityVal = Double(quantity), quantityVal > 0 else {
            self.errorMessage = "Quantity must be a valid positive number."
            self.showingErrorAlert = true
            return nil
        }
        return (trimmedFoodName, proteinVal, trimmedServingSize, quantityVal)
    }

    private func logFood() {
        guard let validData = validateInputs() else {
            return
        }

        // 1. Find or Create FoodItem
        let foodItemFetchRequest: NSFetchRequest<FoodItem> = FoodItem.fetchRequest()
        // Normalize name for searching? For now, exact match (potentially after trimming)
        foodItemFetchRequest.predicate = NSPredicate(format: "name ==[c] %@", validData.name)

        var currentFoodItem: FoodItem?
        do {
            let results = try viewContext.fetch(foodItemFetchRequest)
            currentFoodItem = results.first

            if currentFoodItem == nil {
                currentFoodItem = FoodItem(context: viewContext)
                currentFoodItem?.name = validData.name
                currentFoodItem?.proteinGrams = validData.protein
                currentFoodItem?.servingSize = validData.serving
                currentFoodItem?.timestamp = Date() 
            } else {
                // Optional: Update existing food item if details are different?
                // For now, if found, we use it as-is for protein/serving size.
                // The AI might suggest slightly different values. User can edit.
                // If they save with same name but different values, it won't update the stored FoodItem.
                // This behavior should be clarified: Do we update the "canonical" FoodItem, or just log with the values as entered?
                // Current logic: Creates new if name differs, otherwise uses existing FoodItem's stored values for protein/serving if name matches.
                // Let's adjust to save what the user *confirmed or entered* if it's a new item,
                // or if it's an existing item, the user confirms the details from the AI or edits them.
                // The find/create logic should ensure the *saved* FoodItem has the details present in the form.
                // This means if an item with the same name exists, we might want to update ITS details if they differ,
                // or create a new one if "AI: Banana" is distinct from user's "Banana".
                // For simplicity now: if name matches, use that FoodItem. If name doesn't match, create new.
                // If they edit "AI: Banana" to "Banana" and "Banana" exists, it uses "Banana".
                // If they edit "AI: Banana" to "My Special Banana" and it doesn't exist, it creates "My Special Banana".
                // This seems reasonable. The protein/serving from the form will be used for the *new* FoodItem.
                 if currentFoodItem?.name.lowercased() != validData.name.lowercased() { // If name was edited to something new
                    currentFoodItem = FoodItem(context: viewContext)
                    currentFoodItem?.name = validData.name
                    currentFoodItem?.proteinGrams = validData.protein
                    currentFoodItem?.servingSize = validData.serving
                    currentFoodItem?.timestamp = Date() 
                 } else if currentFoodItem != nil {
                    // If name is same, but other details might have been edited by user from AI suggestion
                    // Decide if we update the global FoodItem or just use these values for the LoggedFoodItem.
                    // For now, let's assume the FoodItem in DB is the canonical one.
                    // The LoggedFoodItem will store the actual consumed values if needed, but FoodItem.proteinGrams is its definition.
                    // This is a bit complex. Let's stick to: if FoodItem name exists, use it. If not, create it with form values.
                    // The LoggedFoodItem uses the FoodItem's canonical values.
                    // For AI, it's better to save what the AI suggested + user edits.
                    // So, if "AI: Banana" is logged, it should be saved as such.
                    // Let's refine: the name in the form IS the name of the FoodItem.
                    // If that FoodItem doesn't exist, create it with the form's protein/serving.
                    // If it DOES exist, use that existing FoodItem. The form's protein/serving are just for display if item exists.
                    // This is what ManualFoodEntry does. Let's stick to that for consistency.
                    // The key difference is that the form is pre-filled.
                    // If "AI: Banana" (protein 1.3) is suggested, and user logs it.
                    //  - If "AI: Banana" doesn't exist, create it with protein 1.3.
                    //  - If "AI: Banana" exists (protein 1.0), it uses existing. User might be confused.
                    // Safest: always save what's in the form as a unique FoodItem if name + serving size is unique.
                    // Or, simpler: the 'name' field is key. If FoodItem with 'name' exists, use it. If not, create it with form values.
                    // This is what the code currently does if I remove the inner `if currentFoodItem?.name.lowercased() ...`
                 }
            }
        } catch {
            self.errorMessage = "Error fetching food item: \(error.localizedDescription)"
            self.showingErrorAlert = true
            return
        }
        
        guard let finalFoodItem = currentFoodItem else {
            self.errorMessage = "Could not find or create FoodItem."
            self.showingErrorAlert = true
            return
        }

        // 2. Create LoggedFoodItem
        let newLoggedItem = LoggedFoodItem(context: viewContext)
        newLoggedItem.foodItem = finalFoodItem 
        newLoggedItem.quantity = validData.qty 
        newLoggedItem.timestamp = Date()

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
            self.errorMessage = "Error fetching daily log: \(error.localizedDescription)"
            self.showingErrorAlert = true
            return
        }
        
        guard let finalDailyLog = currentDailyLog else {
            self.errorMessage = "Could not find or create DailyLog."
            self.showingErrorAlert = true
            return
        }

        // 4. Add LoggedFoodItem to DailyLog
        finalDailyLog.addToConsumedItems(newLoggedItem)

        // 5. Save context
        do {
            try viewContext.save()
            dismiss()
        } catch {
            let nsError = error as NSError
            self.errorMessage = "Failed to save to Core Data: \(nsError.localizedDescription), \(nsError.userInfo)"
            self.showingErrorAlert = true
        }
    }
}

struct AIFoodRecognitionView_Previews: PreviewProvider {
    static var previews: some View {
        let persistenceController = PersistenceController(inMemory: true)
        let context = persistenceController.container.viewContext

        // Scenario 1: Initial State
        let initialStateView = AIFoodRecognitionView(currentDate: Date())
            .environment(\.managedObjectContext, context)

        // Scenario 2: Simulating State
        let simulatingStateView = AIFoodRecognitionView(currentDate: Date())
        simulatingStateView.userInitiatedSimulation = true // Need to set this for simulation to start
        // Can't directly call simulateAIAnalysis here as it's async.
        // We can hack it for preview by setting state vars directly.
        let simulatingPreview = AIFoodRecognitionView(currentDate: Date())
        simulatingPreview._isSimulating.wrappedValue = true // Using property wrapper for @State
        simulatingPreview._simulationAttempted.wrappedValue = true


        // Scenario 3: Results Displayed State (Success)
        let resultsStateView = AIFoodRecognitionView(currentDate: Date())
        resultsStateView._showResultsSection.wrappedValue = true
        resultsStateView._simulationAttempted.wrappedValue = true
        resultsStateView._foodName.wrappedValue = "AI: Apple"
        resultsStateView._proteinGrams.wrappedValue = "0.3"
        resultsStateView._servingSize.wrappedValue = "1 small"
        resultsStateView._quantity.wrappedValue = "1"
        
        // Scenario 4: AI Failed State
        let failedStateView = AIFoodRecognitionView(currentDate: Date())
        failedStateView._simulationAttempted.wrappedValue = true
        failedStateView._errorMessage.wrappedValue = "AI could not identify the food."


        return Group {
            initialStateView
                .previewDisplayName("Initial State")

            simulatingPreview
                .environment(\.managedObjectContext, context)
                .previewDisplayName("Simulating AI")
            
            resultsStateView
                .environment(\.managedObjectContext, context)
                .previewDisplayName("AI Results - Success")

            failedStateView
                .environment(\.managedObjectContext, context)
                .previewDisplayName("AI Results - Failed")
        }
    }
}

// Ensure PersistenceController is available for Previews
// struct PersistenceController {
//     let container: NSPersistentContainer
//     init(inMemory: Bool = false) {
//         container = NSPersistentContainer(name: "YourAppName") // Replace with your app's name
//         if inMemory {
//             container.persistentStoreDescriptions.first!.url = URL(fileURLWithPath: "/dev/null")
//         }
//         container.loadPersistentStores { description, error in
//             if let error = error {
//                 fatalError("Error loading Core Data: \(error.localizedDescription)")
//             }
//         }
//     }
// }
