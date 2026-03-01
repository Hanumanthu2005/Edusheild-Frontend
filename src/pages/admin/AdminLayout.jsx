import { Outlet } from "react-router-dom";

function AdminLayout() {
  return (
    <div>
      {/* You can add Admin Navbar here later */}
      <Outlet />
    </div>
  );
}

export default AdminLayout;