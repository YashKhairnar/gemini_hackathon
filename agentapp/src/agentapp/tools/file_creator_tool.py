from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field
import os
from pathlib import Path


class FileCreatorToolInput(BaseModel):
    """Input schema for FileCreatorTool."""
    file_path: str = Field(..., description="The relative path to the file from the outputs directory (e.g., 'frontend/components/App.jsx')")
    content: str = Field(..., description="The complete file content to write")
    create_directories: bool = Field(True, description="Whether to create parent directories if they don't exist")


class FileCreatorTool(BaseTool):
    name: str = "create_file"
    description: str = (
        "Creates a file with the specified content in the outputs directory. "
        "Use this tool to create code files, configuration files, and any other files needed. "
        "The file_path should be relative to the outputs directory (e.g., 'frontend/components/App.jsx'). "
        "Parent directories will be created automatically if they don't exist. "
        "Example: To create outputs/frontend/components/App.jsx, use file_path='frontend/components/App.jsx'"
    )
    args_schema: Type[BaseModel] = FileCreatorToolInput

    def _run(self, file_path: str, content: str, create_directories: bool = True) -> str:
        """Create a file with the given content."""
        try:
            # Get the outputs directory path
            # This file is in: agentapp/src/agentapp/tools/
            # Outputs directory is: agentapp/src/agentapp/outputs/
            current_file = Path(__file__)
            outputs_dir = current_file.parent.parent / "outputs"
            outputs_dir = outputs_dir.resolve()
            
            # Construct the full file path
            full_path = outputs_dir / file_path
            full_path = full_path.resolve()
            
            # Security check: ensure the file is within the outputs directory
            if not str(full_path).startswith(str(outputs_dir)):
                return f"Error: File path '{file_path}' is outside the outputs directory. Security violation."
            
            # Create parent directories if needed
            if create_directories:
                full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write the file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return f"Successfully created file: {full_path} ({len(content)} characters)"
        except Exception as e:
            return f"Error creating file '{file_path}': {str(e)}"

