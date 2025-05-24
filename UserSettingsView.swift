import SwiftUI
import CoreData

struct UserSettingsView: View {
    @Environment(\.managedObjectContext) private var viewContext

    @State private var userProfile: UserProfile?
    @State private var proteinLimitString: String = ""
    
    @State private var showingSaveConfirmation = false
    @State private var showingErrorAlert = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Daily Protein Goal")) {
                    TextField("Protein Limit (grams)", text: $proteinLimitString)
                        .keyboardType(.decimalPad)
                }

                Button("Save Settings") {
                    saveProteinLimit()
                }
            }
            .navigationTitle("User Settings")
            .onAppear {
                fetchOrCreateUserProfile()
            }
            .alert("Settings Saved", isPresented: $showingSaveConfirmation) {
                Button("OK", role: .cancel) {}
            }
            .alert("Input Error", isPresented: $showingErrorAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func fetchOrCreateUserProfile() {
        let request: NSFetchRequest<UserProfile> = UserProfile.fetchRequest()
        request.fetchLimit = 1 // We only expect one profile

        do {
            let profiles = try viewContext.fetch(request)
            if let existingProfile = profiles.first {
                self.userProfile = existingProfile
                self.proteinLimitString = String(format: "%.1f", existingProfile.dailyProteinLimit)
            } else {
                // No profile exists, create one
                let newProfile = UserProfile(context: viewContext)
                newProfile.id = UUID() // Initialize required non-optional 'id'
                newProfile.dailyProteinLimit = 100.0 // Default value
                
                self.userProfile = newProfile
                self.proteinLimitString = String(format: "%.1f", newProfile.dailyProteinLimit)
                
                // Save the newly created profile immediately
                try viewContext.save()
            }
        } catch {
            // Handle error fetching or saving initial profile
            print("Error fetching or creating UserProfile: \(error.localizedDescription)")
            self.errorMessage = "Could not load user profile. Please try again."
            // self.showingErrorAlert = true // Avoid showing error on initial load unless it's critical
        }
    }

    private func saveProteinLimit() {
        guard let profile = self.userProfile else {
            self.errorMessage = "No user profile found. Please restart the app."
            self.showingErrorAlert = true
            return
        }

        guard let newLimit = Double(proteinLimitString), newLimit >= 0 else {
            self.errorMessage = "Please enter a valid non-negative number for the protein limit."
            self.showingErrorAlert = true
            return
        }

        profile.dailyProteinLimit = newLimit

        do {
            try viewContext.save()
            self.proteinLimitString = String(format: "%.1f", newLimit) // Ensure string is updated to reflect saved value
            self.showingSaveConfirmation = true
        } catch {
            let nsError = error as NSError
            self.errorMessage = "Failed to save protein limit: \(nsError.localizedDescription), \(nsError.userInfo)"
            self.showingErrorAlert = true
        }
    }
}

struct UserSettingsView_Previews: PreviewProvider {
    static var previews: some View {
        // Scenario 1: No UserProfile initially exists
        let persistenceControllerNoProfile = PersistenceController(inMemory: true)
        let contextNoProfile = persistenceControllerNoProfile.container.viewContext
        
        let viewNoProfile = UserSettingsView()
            .environment(\.managedObjectContext, contextNoProfile)
            .previewDisplayName("No Initial Profile")

        // Scenario 2: UserProfile exists with a pre-set limit
        let persistenceControllerWithProfile = PersistenceController(inMemory: true)
        let contextWithProfile = persistenceControllerWithProfile.container.viewContext
        
        let existingProfile = UserProfile(context: contextWithProfile)
        existingProfile.id = UUID()
        existingProfile.dailyProteinLimit = 120.5
        
        do {
            try contextWithProfile.save()
        } catch {
            fatalError("Preview setup failed: \(error.localizedDescription)")
        }
        
        let viewWithProfile = UserSettingsView()
            .environment(\.managedObjectContext, contextWithProfile)
            .previewDisplayName("Existing Profile")

        return Group {
            viewNoProfile
            viewWithProfile
        }
    }
}

// Ensure PersistenceController is available for Previews
// (If not defined elsewhere, include a minimal version)
// struct PersistenceController {
//     let container: NSPersistentContainer
//     init(inMemory: Bool = false) {
//         container = NSPersistentContainer(name: "YourAppName") // Replace with your app's data model name
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
