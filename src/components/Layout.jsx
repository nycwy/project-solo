import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const Layout = () => {
    return (
        <>
            <Outlet />
            <BottomNav />
        </>
    );
};

export default Layout;
