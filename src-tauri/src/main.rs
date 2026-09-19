#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod placement;
use serde::{Deserialize, Serialize};
use std::{fs, sync::Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, PhysicalPosition, WebviewWindow,
};

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Settings {
    position: Option<(i32, i32)>,
    camera: Option<serde_json::Value>,
    topmost: bool,
    fps: u32,
    sound: bool,
    wave: f64,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            position: None,
            camera: None,
            topmost: true,
            fps: 30,
            sound: false,
            wave: 1.0,
        }
    }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PetState {
    editing: bool,
    inspecting: bool,
    ship_hovered: bool,
    paused: bool,
    visible: bool,
    minimized: bool,
    settings: Settings,
}
struct Shared(Mutex<PetState>);
fn window(app: &tauri::AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("main").ok_or("窗口未就绪".into())
}
fn path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let p = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(p.join("settings.json"))
}
fn persist(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<Shared>();
    let s = state.0.lock().map_err(|e| e.to_string())?;
    fs::write(
        path(app)?,
        serde_json::to_vec_pretty(&s.settings).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}
#[tauri::command]
fn pet_state(app: tauri::AppHandle) -> Result<PetState, String> {
    let w = window(&app)?;
    let shared = app.state::<Shared>();
    let mut s = shared.0.lock().map_err(|e| e.to_string())?;
    s.visible = w.is_visible().map_err(|e| e.to_string())?;
    s.minimized = w.is_minimized().map_err(|e| e.to_string())?;
    Ok(s.clone())
}
fn emit(app: &tauri::AppHandle) {
    if let Ok(s) = pet_state(app.clone()) {
        let _ = app.emit("pet-state", s);
    }
}
fn recover_position(app: &tauri::AppHandle, reset: bool) -> Result<(), String> {
    let w = window(app)?;
    let mut size = w.outer_size().map_err(|e| e.to_string())?;
    let monitors = w.available_monitors().map_err(|e| e.to_string())?;
    let mut monitors = monitors;
    if let Some(primary) = w.primary_monitor().map_err(|e| e.to_string())? {
        monitors.sort_by_key(|m| m.position() != primary.position());
    }
    let areas: Vec<_> = monitors
        .iter()
        .map(|m| {
            let r = m.work_area();
            placement::Rect {
                x: r.position.x,
                y: r.position.y,
                w: r.size.width as i32,
                h: r.size.height as i32,
            }
        })
        .collect();
    let p = w.outer_position().map_err(|e| e.to_string())?;
    let mut next = placement::recover(
        (p.x, p.y),
        (size.width as i32, size.height as i32),
        &areas,
        reset,
    );
    // A high-DPI window can be taller than a small monitor's work area.
    if let Some(area) = areas
        .iter()
        .find(|r| next.0 >= r.x && next.0 < r.x + r.w && next.1 >= r.y && next.1 < r.y + r.h)
    {
        let ratio = (area.w as f64 / size.width as f64)
            .min(area.h as f64 / size.height as f64)
            .min(1.0);
        if ratio < 1.0 {
            size = tauri::PhysicalSize::new(
                (size.width as f64 * ratio).floor() as u32,
                (size.height as f64 * ratio).floor() as u32,
            );
            w.set_size(size).map_err(|e| e.to_string())?;
            next = placement::recover(next, (size.width as i32, size.height as i32), &areas, reset);
        }
    }
    if next != (p.x, p.y) {
        w.set_position(PhysicalPosition::new(next.0, next.1))
            .map_err(|e| e.to_string())?;
    }
    app.state::<Shared>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .settings
        .position = Some(next);
    Ok(())
}
fn action(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let w = window(app)?;
    match id {
        "show" => {
            recover_position(app, false)?;
            w.unminimize().map_err(|e| e.to_string())?;
            w.show().map_err(|e| e.to_string())?;
        }
        "hide" => {
            w.hide().map_err(|e| e.to_string())?;
        }
        "edit" => {
            recover_position(app, false)?;
            w.set_ignore_cursor_events(false)
                .map_err(|e| e.to_string())?;
            w.set_focusable(true).map_err(|e| e.to_string())?;
            w.unminimize().map_err(|e| e.to_string())?;
            w.show().map_err(|e| e.to_string())?;
            w.set_focus().map_err(|e| e.to_string())?;
            app.state::<Shared>().0.lock().unwrap().editing = true;
        }
        "lock" => {
            w.set_ignore_cursor_events(true)
                .map_err(|e| e.to_string())?;
            w.set_focusable(false).map_err(|e| e.to_string())?;
            app.state::<Shared>().0.lock().unwrap().editing = false;
            app.state::<Shared>().0.lock().unwrap().inspecting = false;
            app.state::<Shared>().0.lock().unwrap().ship_hovered = false;
        }
        "inspect" => {
            w.set_ignore_cursor_events(false)
                .map_err(|e| e.to_string())?;
            w.set_focusable(true).map_err(|e| e.to_string())?;
            w.set_focus().map_err(|e| e.to_string())?;
            app.state::<Shared>().0.lock().unwrap().inspecting = true;
        }
        "inspect-end" => {
            let editing = app.state::<Shared>().0.lock().unwrap().editing;
            w.set_ignore_cursor_events(!editing)
                .map_err(|e| e.to_string())?;
            w.set_focusable(editing).map_err(|e| e.to_string())?;
            app.state::<Shared>().0.lock().unwrap().inspecting = false;
            app.state::<Shared>().0.lock().unwrap().ship_hovered = false;
        }
        "topmost" => {
            let next = !app.state::<Shared>().0.lock().unwrap().settings.topmost;
            w.set_always_on_top(next).map_err(|e| e.to_string())?;
            app.state::<Shared>().0.lock().unwrap().settings.topmost = next;
        }
        "pause" => {
            let shared = app.state::<Shared>();
            let mut s = shared.0.lock().unwrap();
            s.paused = !s.paused;
        }
        "fps20" | "fps30" => {
            app.state::<Shared>().0.lock().unwrap().settings.fps =
                if id == "fps20" { 20 } else { 30 };
        }
        "sound" => {
            let shared = app.state::<Shared>();
            let mut s = shared.0.lock().unwrap();
            s.settings.sound = !s.settings.sound;
        }
        "reset" => {
            recover_position(app, true)?;
            app.state::<Shared>().0.lock().unwrap().settings.camera = None;
            w.unminimize().map_err(|e| e.to_string())?;
            w.show().map_err(|e| e.to_string())?;
            let _ = app.emit("reset-camera", ());
        }
        "diagnostics" => {
            let _ = app.emit("export-diagnostics", ());
        }
        "quit" => {
            persist(app)?;
            app.emit("save-before-exit", ())
                .map_err(|e| e.to_string())?;
            // Let localStorage flush before closing WebView2; still exit if the frontend is frozen.
            let handle = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(2));
                handle.exit(0);
            });
            return Ok(());
        }
        _ => return Err("未知操作".into()),
    }
    persist(app)?;
    emit(app);
    Ok(())
}
#[tauri::command]
fn pet_action(app: tauri::AppHandle, id: String) -> Result<(), String> {
    action(&app, &id)
}
#[tauri::command]
fn finish_exit(app: tauri::AppHandle) {
    app.exit(0);
}
#[tauri::command]
fn ship_pointer(app: tauri::AppHandle) -> Result<[f64; 2], String> {
    let w = window(&app)?;
    let p = w.cursor_position().map_err(|e| e.to_string())?;
    let origin = w.inner_position().map_err(|e| e.to_string())?;
    let scale = w.scale_factor().map_err(|e| e.to_string())?;
    Ok([
        (p.x - origin.x as f64) / scale,
        (p.y - origin.y as f64) / scale,
    ])
}
#[tauri::command]
fn ship_hover(app: tauri::AppHandle, hit: bool) -> Result<(), String> {
    let w = window(&app)?;
    let shared = app.state::<Shared>();
    let mut state = shared.0.lock().map_err(|e| e.to_string())?;
    if !state.editing && !state.inspecting && state.ship_hovered != hit {
        // Hover alone must never activate the window. Focus is enabled only after the click.
        w.set_ignore_cursor_events(!hit)
            .map_err(|e| e.to_string())?;
        state.ship_hovered = hit;
    }
    Ok(())
}
#[tauri::command]
fn drag_pet(app: tauri::AppHandle) -> Result<(), String> {
    if !app.state::<Shared>().0.lock().unwrap().editing {
        return Err("请先从托盘进入编辑模式".into());
    }
    window(&app)?.start_dragging().map_err(|e| e.to_string())
}
#[tauri::command]
fn save_view(app: tauri::AppHandle, camera: serde_json::Value, wave: f64) -> Result<(), String> {
    if camera.to_string().len() > 1024 || !wave.is_finite() {
        return Err("无效观察参数".into());
    }
    {
        let shared = app.state::<Shared>();
        let mut s = shared.0.lock().unwrap();
        s.settings.camera = Some(camera);
        s.settings.wave = wave.clamp(0.0, 2.0);
    }
    persist(&app)
}
#[tauri::command]
fn write_diagnostics(app: tauri::AppHandle, report: serde_json::Value) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(&report).map_err(|e| e.to_string())?;
    if bytes.len() > 1_000_000 {
        return Err("诊断数据过大".into());
    }
    let p = path(&app)?.with_file_name("diagnostics.json");
    fs::write(p, bytes).map_err(|e| e.to_string())
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = action(app, "edit");
        }))
        .invoke_handler(tauri::generate_handler![
            pet_state,
            pet_action,
            finish_exit,
            ship_pointer,
            ship_hover,
            drag_pet,
            save_view,
            write_diagnostics
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let mut settings: Settings = path(&handle)
                .ok()
                .and_then(|p| fs::read(p).ok())
                .and_then(|b| serde_json::from_slice(&b).ok())
                .unwrap_or_default();
            settings.fps = if settings.fps == 20 { 20 } else { 30 };
            settings.wave = settings.wave.clamp(0.0, 2.0);
            app.manage(Shared(Mutex::new(PetState {
                editing: false,
                inspecting: false,
                ship_hovered: false,
                paused: false,
                visible: true,
                minimized: false,
                settings: settings.clone(),
            })));
            let items = [
                ("show", "显示"),
                ("hide", "隐藏"),
                ("edit", "编辑：移动和旋转"),
                ("lock", "锁定展示：鼠标穿透"),
                ("topmost", "切换置顶"),
                ("pause", "暂停 / 继续"),
                ("fps30", "流畅 · 30 FPS"),
                ("fps20", "节能 · 20 FPS"),
                ("sound", "环境音开 / 关"),
                ("reset", "重置位置和视角"),
                ("diagnostics", "保存性能诊断"),
                ("quit", "退出"),
            ];
            let entries: Vec<_> = items
                .iter()
                .map(|(id, label)| MenuItem::with_id(app, *id, *label, true, None::<&str>))
                .collect::<Result<_, _>>()?;
            let refs: Vec<&dyn tauri::menu::IsMenuItem<_>> = entries
                .iter()
                .map(|m| m as &dyn tauri::menu::IsMenuItem<_>)
                .collect();
            let menu = Menu::with_items(app, &refs)?;
            let mut pixels = vec![0u8; 32 * 32 * 4];
            for y in 0..32 {
                for x in 0..32 {
                    let i = (y * 32 + x) * 4;
                    let ship = (y > 15 && y < 23 && x > 5 && x < 27)
                        || (y > 8 && y <= 15 && x > 12 && x < 22);
                    pixels[i..i + 4].copy_from_slice(if ship {
                        &[246, 249, 238, 255]
                    } else {
                        &[43, 120, 153, 255]
                    });
                }
            }
            TrayIconBuilder::with_id("ocean-tray")
                .icon(tauri::image::Image::new_owned(pixels, 32, 32))
                .tooltip("一方小海 · 右键编辑 / 锁定")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if let Err(error) = action(app, event.id.as_ref()) {
                        eprintln!("Tray action: {error}");
                    }
                })
                .build(app)?;
            // Create the recovery tray BEFORE enabling click-through or showing the window.
            let w = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("一方小海")
            .inner_size(560.0, 540.0)
            .transparent(true)
            .background_color(tauri::window::Color(0, 0, 0, 0))
            .decorations(false)
            .shadow(false)
            .resizable(false)
            .skip_taskbar(true)
            .focused(false)
            .focusable(false)
            .always_on_top(settings.topmost)
            .visible(false)
            .build()?;
            if let Some((x, y)) = settings.position {
                w.set_position(PhysicalPosition::new(x, y))?;
            }
            recover_position(&handle, settings.position.is_none())
                .map_err(std::io::Error::other)?;
            w.set_ignore_cursor_events(true)?;
            w.show()?;
            let events = handle.clone();
            w.on_window_event(move |event| match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = action(&events, "hide");
                }
                tauri::WindowEvent::Moved(p) => {
                    events.state::<Shared>().0.lock().unwrap().settings.position = Some((p.x, p.y));
                }
                tauri::WindowEvent::Resized(_) => {
                    emit(&events);
                }
                _ => {}
            });
            // Topology/scale polling does not depend on focus or frontend rendering.
            std::thread::spawn(move || {
                let mut previous = String::new();
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let a = handle.clone();
                    let old = previous.clone();
                    let (tx, rx) = std::sync::mpsc::channel();
                    if handle
                        .run_on_main_thread(move || {
                            let topology = window(&a)
                                .ok()
                                .and_then(|w| w.available_monitors().ok())
                                .map(|m| {
                                    format!(
                                        "{m:?} scale={:?}",
                                        window(&a).ok().and_then(|w| w.scale_factor().ok())
                                    )
                                })
                                .unwrap_or_default();
                            if topology != old {
                                let _ = recover_position(&a, false);
                                let _ = persist(&a);
                            }
                            let _ = tx.send(topology);
                        })
                        .is_err()
                    {
                        break;
                    }
                    match rx.recv() {
                        Ok(next) => previous = next,
                        Err(_) => break,
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Unable to run Tiny Tides");
}
