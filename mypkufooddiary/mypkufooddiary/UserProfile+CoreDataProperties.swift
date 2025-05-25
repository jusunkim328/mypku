import Foundation
import CoreData

extension UserProfile {

    @nonobjc public class func fetchRequest() -> NSFetchRequest<UserProfile> {
        return NSFetchRequest<UserProfile>(entityName: "UserProfile")
    }

    @NSManaged public var dailyProteinLimit: Double
    @NSManaged public var id: UUID

}

extension UserProfile : Identifiable {

}
