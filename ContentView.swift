import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            // Tab 1: Diary
            NavigationView {
                CalendarView()
            }
            .tabItem {
                Label("Diary", systemImage: "book.fill")
            }

            // Tab 2: Settings
            NavigationView {
                UserSettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape.fill")
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
    }
}
