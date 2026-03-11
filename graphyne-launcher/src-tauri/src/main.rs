// Prevents a terminal window appearing on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    graphyne_launcher_lib::run();
}