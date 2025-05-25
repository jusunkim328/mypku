import SwiftUI
import CoreData

struct DailyLogView: View {
    @Environment(\.managedObjectContext) private var viewContext
    var selectedDate: Date

    // FetchRequest for DailyLog corresponding to the selectedDate
    @FetchRequest private var dailyLogs: FetchedResults<DailyLog>

    // FetchRequest for UserProfile (assuming a single profile for now)
    @FetchRequest(
        entity: UserProfile.entity(),
        sortDescriptors: []
    ) private var userProfiles: FetchedResults<UserProfile>

    // Initializer to set up the FetchRequest predicate
    init(selectedDate: Date) {
        self.selectedDate = selectedDate
        
        // Prepare date range for the predicate
        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: selectedDate)
        let endDate = calendar.date(byAdding: .day, value: 1, to: startDate)!
        
        self._dailyLogs = FetchRequest<DailyLog>(
            sortDescriptors: [NSSortDescriptor(keyPath: \DailyLog.date, ascending: true)],
            predicate: NSPredicate(format: "date >= %@ AND date < %@", startDate as NSDate, endDate as NSDate)
        )
    }

    private var dailyLogForSelectedDate: DailyLog? {
        dailyLogs.first
    }

    private var userProfile: UserProfile? {
        userProfiles.first
    }

    private var totalProteinToday: Double {
        guard let log = dailyLogForSelectedDate, let items = log.consumedItems as? Set<LoggedFoodItem> else {
            return 0.0
        }
        return items.reduce(0) { $0 + ($1.foodItem.proteinGrams * $1.quantity) }
    }

    var body: some View {
        VStack(alignment: .leading) {
            Text("Log for \(selectedDate, formatter: itemFormatter)")
                .font(.headline)
                .padding(.bottom)

            if let log = dailyLogForSelectedDate, let items = log.consumedItems as? Set<LoggedFoodItem>, !items.isEmpty {
                List {
                    ForEach(Array(items.sorted(by: { $0.timestamp < $1.timestamp })), id: \.self) { loggedItem in
                        HStack {
                            Text(loggedItem.foodItem.name)
                            Spacer()
                            Text("\(loggedItem.foodItem.proteinGrams * loggedItem.quantity, specifier: "%.1f")g P")
                                .foregroundColor(.secondary)
                            Text("(\(loggedItem.quantity, specifier: "%.1f")x \(loggedItem.foodItem.servingSize ?? "serving"))")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }

                Spacer()

                VStack(alignment: .leading, spacing: 5) {
                    Text("Total Protein: \(totalProteinToday, specifier: "%.1f")g")
                        .font(.title2)
                    
                    if let profile = userProfile {
                        Text("Daily Limit: \(profile.dailyProteinLimit, specifier: "%.1f")g")
                            .font(.subheadline)
                        
                        ProgressView(value: totalProteinToday, total: profile.dailyProteinLimit)
                            .progressViewStyle(LinearProgressViewStyle(tint: proteinProgressColor(profile: profile)))
                        
                        if totalProteinToday > profile.dailyProteinLimit {
                            Text("You are over your daily protein limit!")
                                .foregroundColor(.red)
                                .font(.caption)
                        } else if totalProteinToday >= profile.dailyProteinLimit * 0.8 {
                            Text("Approaching daily protein limit.")
                                .foregroundColor(.orange)
                                .font(.caption)
                        }
                    } else {
                        Text("No user profile set up to check protein limit.")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                .padding()

            } else {
                Text("No food items logged for this date.")
                    .foregroundColor(.gray)
                Spacer()
            }
        }
        .padding()
        .navigationTitle("Daily Log for \(selectedDate, formatter: itemFormatter)")
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Menu {
                    Button("Log Manually") {
                        showingManualEntrySheet = true
                    }
                    Button("Quick Add from List") {
                        showingQuickAddSheet = true
                    }
                    Button("Log with AI (Simulated)") {
                        showingAIRecognitionSheet = true
                    }
                } label: {
                    Label("Add Food", systemImage: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $showingManualEntrySheet) {
            ManualFoodEntryView(currentDate: selectedDate)
                .environment(\.managedObjectContext, viewContext)
        }
        .sheet(isPresented: $showingQuickAddSheet) {
            QuickAddFoodView(currentDate: selectedDate)
                .environment(\.managedObjectContext, viewContext)
        }
        .sheet(isPresented: $showingAIRecognitionSheet) {
            AIFoodRecognitionView(currentDate: selectedDate)
                .environment(\.managedObjectContext, viewContext)
        }
    }

    // State variables for presenting modal sheets
    @State private var showingManualEntrySheet = false
    @State private var showingQuickAddSheet = false
    @State private var showingAIRecognitionSheet = false

    private func proteinProgressColor(profile: UserProfile) -> Color {
        if totalProteinToday > profile.dailyProteinLimit {
            return .red
        } else if totalProteinToday >= profile.dailyProteinLimit * 0.8 {
            return .orange
        } else {
            return .green
        }
    }
}

private let itemFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .long
    formatter.timeStyle = .none
    return formatter
}()

struct DailyLogView_Previews: PreviewProvider {
    static var previews: some View {
        // Use the static preview from PersistenceController for a consistent preview environment
        let context = PersistenceController.preview.container.viewContext

        // Mock UserProfile (if not already sufficiently covered by PersistenceController.preview)
        // PersistenceController.preview already creates a UserProfile.
        
        // Mock DailyLog for today (if not already sufficiently covered)
        // PersistenceController.preview already creates a DailyLog with items for today.

        // Mock DailyLog for yesterday (empty)
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        // To ensure yesterday's log is truly empty for the preview, we can create one if PersistenceController doesn't specifically guarantee an empty one.
        // However, the current FetchRequest in DailyLogView will just show "No food items logged" if no log exists or if it's empty.
        // Let's ensure one exists for "Yesterday (Empty)" case for clarity in preview.
        let yesterdayLog = DailyLog(context: context) // Create a new one for preview
        yesterdayLog.date = Calendar.current.startOfDay(for: yesterday)
        // No items added to yesterdayLog

        // No need to save context here if PersistenceController.preview already did,
        // but if we added 'yesterdayLog', we might need to.
        // For safety, let's assume PersistenceController.preview handles initial save.
        // If yesterdayLog is new, it should be saved for the preview to correctly pick it up.
        // However, preview context is often reset. The important part is that selectedDate makes it fetch correctly.

        return Group {
            NavigationView {
                DailyLogView(selectedDate: Date()) // Today's log - uses data from PersistenceController.preview
            }
            .environment(\.managedObjectContext, context)
            .previewDisplayName("Today (With Data)")

            NavigationView {
                DailyLogView(selectedDate: yesterday) // Yesterday's log (should be empty or show no log)
            }
            .environment(\.managedObjectContext, context)
            .previewDisplayName("Yesterday (Empty/No Log)")
            
            NavigationView {
                // A date that certainly won't have a log from PersistenceController.preview
                DailyLogView(selectedDate: Calendar.current.date(byAdding: .day, value: -2, to: Date())!) 
            }
            .environment(\.managedObjectContext, context)
            .previewDisplayName("Day Before Yesterday (No Log)")
        }
    }
}

// The dummy PersistenceController definition is removed from here as it's now in Persistence.swift
// and PersistenceController.preview is used.
