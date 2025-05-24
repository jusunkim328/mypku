//
//  mypkufooddiaryApp.swift
//  mypkufooddiary
//
//  Created by Amor Mundis on 5/25/25.
//

import SwiftUI

@main
struct mypkufooddiaryApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
