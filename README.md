if __name__ == "__main__":
    folder_path = input("Enter the folder path to scan and update Word documents: ").strip()

    if not folder_path or not os.path.exists(folder_path):
        print("Invalid path. Please provide a valid directory.")
        sys.exit(1)

    scan_and_update_documents(folder_path)