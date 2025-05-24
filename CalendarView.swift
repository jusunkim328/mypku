import SwiftUI

struct CalendarView: View {
    @State private var selectedDate: Date = Date()

    var body: some View {
        VStack {
            DatePicker(
                "Select Date",
                selection: $selectedDate,
                displayedComponents: .date
            )
            .datePickerStyle(GraphicalDatePickerStyle())
            .padding()

            Text("Selected Date: \(selectedDate, formatter: dateFormatter)")
                .padding()

            NavigationLink(destination: DailyLogView(selectedDate: selectedDate)) {
                Text("View Log for \(selectedDate, formatter: dateFormatter)")
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .padding(.horizontal)
            
            Spacer() // Pushes content to the top
        }
        .navigationTitle("Calendar")
    }

    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        return formatter
    }
}

struct CalendarView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            CalendarView()
        }
        .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
    }
}
