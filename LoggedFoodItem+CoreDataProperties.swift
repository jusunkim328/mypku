import Foundation
import CoreData

extension LoggedFoodItem {

    @nonobjc public class func fetchRequest() -> NSFetchRequest<LoggedFoodItem> {
        return NSFetchRequest<LoggedFoodItem>(entityName: "LoggedFoodItem")
    }

    @NSManaged public var quantity: Double
    @NSManaged public var timestamp: Date
    @NSManaged public var foodItem: FoodItem
    @NSManaged public var dailyLog: DailyLog

}

extension LoggedFoodItem : Identifiable {

}
