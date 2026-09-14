from PySide6.QtWidgets import QWidget
from PySide6.QtCore import Qt

from ui.flow.widgets.flow_node_card import FlowNodeCard

class FlowMapViewport(QWidget):
    def __init__(self, parent_window=None, parent=None):
        super().__init__(parent)

        self.parent_window = parent_window

        self.setObjectName("FlowMapViewport")
        self.setCursor(Qt.OpenHandCursor)

        self.is_panning = False
        self.pan_start_pos = None
        self.pan_target = None

    def set_pan_target(self, widget):
        self.pan_target = widget

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.is_panning = True
            self.pan_start_pos = event.position().toPoint()
            if self.parent_window:
                self.parent_window.set_tool_cursor(
                    "cursor_hold.png"
                )

    def mouseMoveEvent(self, event):
        #print("Viewport Mouse Move")
        if self.parent_window:
            self.parent_window.update_mouse_position_debug(
                event.position().toPoint(),
                self
            )

        if not self.is_panning or not self.pan_target:
            return

        current_pos = event.position().toPoint()
        delta = current_pos - self.pan_start_pos
        self.pan_start_pos = current_pos

        self.pan_target.move(
            self.pan_target.x() + delta.x(),
            self.pan_target.y() + delta.y()
        )

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.is_panning = False

            if self.parent_window:
                self.parent_window.apply_current_tool_cursor()

    def wheelEvent(self, event):
        if self.parent_window:
            delta = event.angleDelta().y()
            mouse_pos = event.position().toPoint()
            if delta > 0:
                self.parent_window.adjust_zoom(0.1, mouse_pos)
            else:
                self.parent_window.adjust_zoom(-0.1, mouse_pos)
        event.accept()

    def contextMenuEvent(self, event):
        # Only on genuinely empty map space, not on a node (User-Wunsch,
        # 2026-09-13: "Wenn man auf einen freien Punkt auf der Map (kein
        # Node) mit der rechten Maustaste klickt") -- FlowNodeCard has no
        # contextMenuEvent of its own, so a right-click on a card would
        # otherwise bubble up here too (Qt auto-propagates an unhandled
        # ContextMenu event to the parent chain); a plain geometry check
        # against every node card is simpler and more robust here than
        # relying on childAt()'s WA_TransparentForMouseEvents handling.
        if self.pan_target:
            local_pos = self.pan_target.mapFromParent(event.pos())
            for card in self.pan_target.findChildren(FlowNodeCard):
                if card.geometry().contains(local_pos):
                    return
        if self.parent_window:
            self.parent_window.show_tool_context_menu(self.mapToGlobal(event.pos()))