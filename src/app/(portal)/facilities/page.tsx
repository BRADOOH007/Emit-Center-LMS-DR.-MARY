import { FacilityManager } from '@/components/facilities/FacilityManager';

export default function FacilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Admin</p>
        <h1 className="page-title">Facility & Resource Management</h1>
        <p className="page-subtitle mt-1">
          Reserve rooms, equipment, robotics kits, and lab resources.
        </p>
      </div>
      <FacilityManager />
    </div>
  );
}
