LOCAL_FILE_REGEX = re.compile(
    r'('
    r'file://[^\s<>"\'{}|\\^`\]]+\.\w{2,5}'  # file://... with extension
    r'|[A-Za-z]:[\\/][^\s<>"\'{}|\\^`\]]+\.\w{2,5}'  # Absolute path with extension
    r'|(?:\.\.?[\\/]|[^:/\\\s<>|]+[\\/])[^\s<>"\'{}|\\^`\]]+\.\w{2,5}'  # Relative with extension
    r')',
    re.IGNORECASE
)