import Foundation
import CoreData

extension DailyLog {

    @nonobjc public class func fetchRequest() -> NSFetchRequest<DailyLog> {
        return NSFetchRequest<DailyLog>(entityName: "DailyLog")
    }

    @NSManaged public var date: Date
    @NSManaged public var consumedItems: NSOrderedSet?

}

// MARK: Generated accessors for consumedItems
extension DailyLog {

    @objc(insertObject:inConsumedItemsAtIndex:)
    @NSManaged public func insertIntoConsumedItems(_ value: LoggedFoodItem, at idx: Int)

    @objc(removeObjectFromConsumedItemsAtIndex:)
    @NSManaged public func removeFromConsumedItems(at idx: Int)

    @objc(insertConsumedItems:atIndexes:)
    @NSManaged public func insertIntoConsumedItems(_ values: [LoggedFoodItem], at indexes: NSIndexSet)

    @objc(removeConsumedItemsAtIndexes:)
    @NSManaged public func removeFromConsumedItems(at indexes: NSIndexSet)

    @objc(replaceObjectInConsumedItemsAtIndex:withObject:)
    @NSManaged public func replaceConsumedItems(at idx: Int, with value: LoggedFoodItem)

    @objc(replaceConsumedItemsAtIndexes:withConsumedItems:)
    @NSManaged public func replaceConsumedItems(at indexes: NSIndexSet, with values: [LoggedFoodItem])

    @objc(addConsumedItemsObject:)
    @NSManaged public func addToConsumedItems(_ value: LoggedFoodItem)

    @objc(removeConsumedItemsObject:)
    @NSManaged public func removeFromConsumedItems(_ value: LoggedFoodItem)

    @objc(addConsumedItems:)
    @NSManaged public func addToConsumedItems(_ values: NSOrderedSet)

    @objc(removeConsumedItems:)
    @NSManaged public func removeFromConsumedItems(_ values: NSOrderedSet)

}

extension DailyLog : Identifiable {

}
