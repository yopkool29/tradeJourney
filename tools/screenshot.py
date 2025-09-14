#!/usr/bin/env python3

import io
import os
import subprocess
import time
import glob
import platform
import shutil
from pathlib import Path
from tkinter import messagebox, Tk

# Dossier temporaire pour les captures d'écran
TEMP_FOLDER = "screenshots"
TEMP_CAPTURE_FOLDER = os.path.join("/tmp", TEMP_FOLDER)
os.makedirs(TEMP_CAPTURE_FOLDER, exist_ok=True, mode=0o777)  # Assure des permissions suffisantes


def copy_to_clipboard(file_path):
    """Copie l'image dans le presse-papiers"""
    try:
        if platform.system() == "Linux":
            # Pour Linux avec xclip pour copier l'image directement
            try:
                # Essayer de copier l'image en tant qu'image
                subprocess.run(["xclip", "-selection", "clipboard", "-t", "image/png", "-i", file_path], check=True)
                return True
            except FileNotFoundError:
                # Fallback vers xclip avec le chemin si l'option -i n'est pas supportée
                try:
                    with open(file_path, "rb") as f:
                        img_data = f.read()
                    subprocess.run(["xclip", "-selection", "clipboard", "-t", "image/png"], input=img_data, check=True)
                    return True
                except Exception:
                    # Dernier recours : copier juste le chemin
                    subprocess.run(["xclip", "-selection", "clipboard"], input=file_path.encode(), check=True)
                    return True
        elif platform.system() == "Windows":
            # Pour Windows
            try:
                import win32clipboard
                from PIL import Image

                image = Image.open(file_path)
                output = io.BytesIO()
                image.convert("RGB").save(output, "BMP")
                data = output.getvalue()[14:]  # En-tête BMP à supprimer
                output.close()

                win32clipboard.OpenClipboard()
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
                win32clipboard.CloseClipboard()
                return True
            except Exception as e:
                print(f"Error while copying to clipboard on Windows: {e}")
                return False
        elif platform.system() == "Darwin":
            # Pour macOS
            try:
                subprocess.run(["osascript", "-e", f'set the clipboard to (read (POSIX file "{file_path}") as JPEG picture)'], check=True)
                return True
            except Exception:
                try:
                    subprocess.run(["pbcopy"], input=file_path.encode(), check=True)
                    return True
                except Exception as e:
                    print(f"Error while copying to clipboard on macOS: {e}")
                    return False
    except Exception as e:
        print(f"Unable to copy to clipboard: {e}")
        return False
    return False


def capture_screen(show_message=True):
    """
    Launches the native screenshot tool (Windows/Linux) and returns the path to the captured image.

    Returns:
        str or None: Path to the captured image file, or None if an error occurred
    """
    os_type = platform.system()

    if show_message:
        messagebox.showinfo("Screenshot", f"The screenshot tool will open. " f"Please save the screenshot in the folder:\n{TEMP_CAPTURE_FOLDER}")

    initial_files = set(glob.glob(os.path.join(TEMP_CAPTURE_FOLDER, "*.png")))

    try:
        if os_type == "Windows":
            subprocess.run(["snippingtool.exe"], check=True)
        elif os_type == "Linux":
            # Essayer d'abord gnome-screenshot, puis flameshot si disponible
            try:
                subprocess.run(["gnome-screenshot", "-a", "-f", os.path.join(TEMP_CAPTURE_FOLDER, f"capture_{int(time.time())}.png")], check=True)
            except FileNotFoundError:
                try:
                    subprocess.run(["flameshot", "gui", "--path", TEMP_CAPTURE_FOLDER], check=True)
                except FileNotFoundError:
                    messagebox.showerror("Error", "No screenshot tool found. Please install gnome-screenshot or flameshot.")
                    return None
        else:
            messagebox.showerror("Error", f"Operating system {os_type} not supported.")
            return None

        # Attendre la capture
        timeout = 30
        start_time = time.time()
        while time.time() - start_time < timeout:
            current_files = set(glob.glob(os.path.join(TEMP_CAPTURE_FOLDER, "*.png")))
            new_files = current_files - initial_files
            if new_files:
                return new_files.pop()
            time.sleep(1)

        messagebox.showerror("Error", "No screenshot was detected within the time limit.")
        return None

    except Exception as e:
        messagebox.showerror("Error", f"Failed to launch screenshot tool: {str(e)}")
        return None
    finally:
        # Nettoyer les anciennes captures (plus de 10 fichiers)
        try:
            files = sorted(Path(TEMP_CAPTURE_FOLDER).glob("*.png"), key=os.path.getmtime, reverse=True)
            for old_file in files[10:]:  # Garder les 10 fichiers les plus récents
                try:
                    os.remove(old_file)
                except Exception:
                    pass
        except Exception as e:
            print(f"Error cleaning up old captures: {e}")


if __name__ == "__main__":
    # Exemple d'utilisation
    captured_file = capture_screen(show_message=False)
    if captured_file:
        print(f"Screenshot saved: {captured_file}")
        if copy_to_clipboard(captured_file):
            print("The path has been copied to the clipboard")
        else:
            print("Unable to copy to clipboard")
