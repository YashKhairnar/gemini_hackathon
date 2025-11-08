import os
import json
import shutil
from pathlib import Path

class FileManager:
    """Manages file system operations for the IDE"""

    def __init__(self, workspace_root=None):
        self.workspace_root = workspace_root or os.path.expanduser('~')
        # Ensure workspace root exists
        os.makedirs(self.workspace_root, exist_ok=True)

    def _get_safe_path(self, relative_path):
        """Get absolute path and ensure it's within workspace"""
        # Remove leading slash if present
        if relative_path.startswith('/'):
            relative_path = relative_path[1:]

        abs_path = os.path.normpath(os.path.join(self.workspace_root, relative_path))

        # Security check: ensure path is within workspace
        if not abs_path.startswith(os.path.normpath(self.workspace_root)):
            raise ValueError("Access denied: path outside workspace")

        return abs_path

    def list_files(self, path=''):
        """List files and directories at the given path"""
        try:
            abs_path = self._get_safe_path(path)

            if not os.path.exists(abs_path):
                return {'error': 'Path does not exist'}

            items = []
            for item_name in sorted(os.listdir(abs_path)):
                # Skip hidden files
                if item_name.startswith('.'):
                    continue

                item_path = os.path.join(abs_path, item_name)
                is_dir = os.path.isdir(item_path)

                items.append({
                    'name': item_name,
                    'type': 'folder' if is_dir else 'file',
                    'path': os.path.join(path, item_name) if path else item_name
                })

            return {'items': items}

        except Exception as e:
            return {'error': str(e)}

    def get_file_tree(self, path='', max_depth=2):
        """Get recursive file tree structure"""
        try:
            abs_path = self._get_safe_path(path)

            if not os.path.exists(abs_path):
                return {'error': 'Path does not exist'}

            def build_tree(current_path, current_depth=0):
                if current_depth > max_depth:
                    return None

                tree = {}
                try:
                    items = os.listdir(current_path)
                    # Limit number of items to prevent hanging
                    if len(items) > 500:
                        return {}

                    for item_name in sorted(items)[:200]:  # Max 200 items per directory
                        # Skip hidden files and common excluded directories
                        excluded = ['node_modules', '__pycache__', 'venv', 'env', 'Library',
                                  'Applications', 'System', '.Trash', 'Downloads', 'Movies',
                                  'Music', 'Pictures', 'Public', '.npm', '.cache']
                        if item_name.startswith('.') or item_name in excluded:
                            continue

                        item_path = os.path.join(current_path, item_name)

                        try:
                            if os.path.isdir(item_path):
                                children = build_tree(item_path, current_depth + 1)
                                if children is not None:
                                    tree[item_name] = {
                                        'type': 'folder',
                                        'children': children
                                    }
                            else:
                                # Don't read file content in tree endpoint - too slow
                                tree[item_name] = {
                                    'type': 'file',
                                    'content': ''
                                }
                        except (PermissionError, OSError):
                            # Skip files/folders we can't access
                            continue

                except PermissionError:
                    pass

                return tree

            tree = build_tree(abs_path)
            return tree

        except Exception as e:
            return {'error': str(e)}

    def read_file(self, file_path):
        """Read file content"""
        try:
            abs_path = self._get_safe_path(file_path)

            if not os.path.exists(abs_path):
                return {'error': 'File does not exist'}

            if not os.path.isfile(abs_path):
                return {'error': 'Path is not a file'}

            with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            return {
                'content': content,
                'path': file_path
            }

        except Exception as e:
            return {'error': str(e)}

    def write_file(self, file_path, content):
        """Write content to a file"""
        try:
            abs_path = self._get_safe_path(file_path)

            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)

            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return {'success': True, 'path': file_path}

        except Exception as e:
            return {'error': str(e)}

    def create_file(self, file_path, content=''):
        """Create a new file"""
        try:
            abs_path = self._get_safe_path(file_path)

            if os.path.exists(abs_path):
                return {'error': 'File already exists'}

            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)

            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return {'success': True, 'path': file_path}

        except Exception as e:
            return {'error': str(e)}

    def create_folder(self, folder_path):
        """Create a new folder"""
        try:
            abs_path = self._get_safe_path(folder_path)

            if os.path.exists(abs_path):
                return {'error': 'Folder already exists'}

            os.makedirs(abs_path, exist_ok=True)

            return {'success': True, 'path': folder_path}

        except Exception as e:
            return {'error': str(e)}

    def delete_file(self, file_path):
        """Delete a file"""
        try:
            abs_path = self._get_safe_path(file_path)

            if not os.path.exists(abs_path):
                return {'error': 'File does not exist'}

            if os.path.isfile(abs_path):
                os.remove(abs_path)
            else:
                return {'error': 'Path is not a file'}

            return {'success': True}

        except Exception as e:
            return {'error': str(e)}

    def delete_folder(self, folder_path):
        """Delete a folder and its contents"""
        try:
            abs_path = self._get_safe_path(folder_path)

            if not os.path.exists(abs_path):
                return {'error': 'Folder does not exist'}

            if os.path.isdir(abs_path):
                shutil.rmtree(abs_path)
            else:
                return {'error': 'Path is not a folder'}

            return {'success': True}

        except Exception as e:
            return {'error': str(e)}

    def rename(self, old_path, new_name):
        """Rename a file or folder"""
        try:
            old_abs_path = self._get_safe_path(old_path)

            if not os.path.exists(old_abs_path):
                return {'error': 'Path does not exist'}

            # Get parent directory and create new path
            parent_dir = os.path.dirname(old_abs_path)
            new_abs_path = os.path.join(parent_dir, new_name)

            # Security check for new path
            if not new_abs_path.startswith(os.path.normpath(self.workspace_root)):
                return {'error': 'Access denied'}

            if os.path.exists(new_abs_path):
                return {'error': 'Target path already exists'}

            os.rename(old_abs_path, new_abs_path)

            # Calculate relative path
            new_rel_path = os.path.relpath(new_abs_path, self.workspace_root)

            return {'success': True, 'new_path': new_rel_path}

        except Exception as e:
            return {'error': str(e)}

    def set_workspace(self, workspace_path):
        """Set the workspace root directory"""
        abs_path = os.path.abspath(os.path.expanduser(workspace_path))

        if not os.path.exists(abs_path):
            return {'error': 'Workspace path does not exist'}

        if not os.path.isdir(abs_path):
            return {'error': 'Workspace path is not a directory'}

        self.workspace_root = abs_path
        return {'success': True, 'workspace': abs_path}

    def get_workspace(self):
        """Get the current workspace root directory"""
        return {'workspace': self.workspace_root}
