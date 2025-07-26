"""
Startup validation utilities to ensure proper file system setup
"""
import logging
from pathlib import Path
from typing import List, Tuple

logger = logging.getLogger(__name__)

def validate_file_system_setup() -> List[Tuple[str, bool, str]]:
    """
    Validate that the file system is properly set up for document storage
    Returns list of (check_name, passed, message) tuples
    """
    checks = []
    
    # Check 1: Working directory
    cwd = Path.cwd()
    checks.append((
        "Working Directory", 
        True, 
        f"Current working directory: {cwd.absolute()}"
    ))
    
    # Check 2: Documents base directory exists
    docs_dir = cwd / "data" / "documents"
    docs_exists = docs_dir.exists()
    checks.append((
        "Documents Directory", 
        docs_exists, 
        f"Documents directory {'exists' if docs_exists else 'missing'}: {docs_dir.absolute()}"
    ))
    
    # Check 3: Can create test directory
    test_dir = docs_dir / "test_user_validation"
    try:
        test_dir.mkdir(parents=True, exist_ok=True)
        test_file = test_dir / "test.txt"
        test_file.write_text("test")
        can_write = test_file.exists()
        test_file.unlink(missing_ok=True)
        test_dir.rmdir()
        checks.append((
            "Write Permissions", 
            can_write, 
            f"Can write to documents directory: {can_write}"
        ))
    except Exception as e:
        checks.append((
            "Write Permissions", 
            False, 
            f"Cannot write to documents directory: {str(e)}"
        ))
    
    # Check 4: Validate existing user directories
    if docs_exists:
        user_dirs = [d for d in docs_dir.iterdir() if d.is_dir() and d.name.startswith("user_")]
        checks.append((
            "User Directories", 
            True, 
            f"Found {len(user_dirs)} user directories"
        ))
        
        # Check for orphaned files
        orphaned_files = []
        for user_dir in user_dirs[:3]:  # Check first 3 user directories
            for file_path in user_dir.iterdir():
                if file_path.is_file():
                    # Check if file is accessible
                    try:
                        file_path.stat()
                        accessible = True
                    except Exception:
                        accessible = False
                        orphaned_files.append(str(file_path))
        
        checks.append((
            "File Accessibility", 
            len(orphaned_files) == 0, 
            f"Orphaned/inaccessible files: {len(orphaned_files)}"
        ))
    
    return checks

def log_validation_results():
    """Log validation results at startup"""
    logger.info("=== File System Validation ===")
    checks = validate_file_system_setup()
    
    all_passed = True
    for check_name, passed, message in checks:
        level = logging.INFO if passed else logging.WARNING
        status = "✓" if passed else "✗"
        logger.log(level, f"{status} {check_name}: {message}")
        if not passed:
            all_passed = False
    
    if all_passed:
        logger.info("✓ All file system checks passed")
    else:
        logger.warning("⚠ Some file system checks failed - document operations may not work correctly")
    
    logger.info("=== End Validation ===")
    return all_passed