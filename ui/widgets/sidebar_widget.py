from PySide6.QtWidgets import QWidget, QVBoxLayout, QPushButton
from PySide6.QtCore import Signal


class SidebarWidget(QWidget):
    page_changed = Signal(str)

    def __init__(self):
        super().__init__()

        self.setObjectName("SidebarWidget")
        self.setFixedWidth(190)

        self.pages = {
            "tasks": "todo",
            "plan": "plan",
            "armory": "armory",
            "settings": "settings",
            "about": "about",
        }

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        self.buttons = {}
        # Whether the "armory" nav entry should carry an "(Expert)" suffix
        # -- set by MainWindow._update_armory_visibility(), which owns the
        # actual logic (this widget just renders labels). Renamed from
        # "(Beta)" once Armory left beta and became a permanent feature
        # (User-Wunsch, 2026-09-10).
        self._armory_expert_marked = False

        for key, translation_key in self.pages.items():
            button = QPushButton(translation_key)
            button.setCheckable(True)
            button.setObjectName("sidebarButton")
            button.clicked.connect(
                lambda checked=False, page_key=key: self.set_active_page(page_key)
            )

            layout.addWidget(button)
            self.buttons[key] = button

        layout.addStretch()

        self.set_active_page("tasks")

    def set_active_page(self, page_key: str):
        for key, button in self.buttons.items():
            button.setChecked(key == page_key)

        self.page_changed.emit(page_key)

    def set_armory_expert_marked(self, marked: bool):
        self._armory_expert_marked = marked

    def update_language(self, language: str, tr_func):
        for key, translation_key in self.pages.items():
            label = tr_func(language, translation_key)
            # Kept as a plain, untranslated "(Expert)" suffix rather than a
            # new translation key per language, same reasoning as the old
            # "(Beta)" marker it replaced -- a short, permanent label, not
            # core UI copy.
            if key == "armory" and self._armory_expert_marked:
                label = f"{label} (Expert)"
            self.buttons[key].setText(label)
