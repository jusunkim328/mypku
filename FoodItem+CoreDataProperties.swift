import Foundation
import CoreData

extension FoodItem {

    @nonobjc public class func fetchRequest() -> NSFetchRequest<FoodItem> {
        return NSFetchRequest<FoodItem>(entityName: "FoodItem")
    }

    @NSManaged public var name: String
    @NSManaged public var proteinGrams: Double
    @NSManaged public var servingSize: String?
    @NSManaged public var timestamp: Date

}

extension FoodItem : Identifiable {

}
