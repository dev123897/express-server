commands=("zip")

for cmd in "${commands[@]}"; do
        if ! command -v $cmd 2>&1 >/dev/null; then
                echo missing dependency $cmd
                exit 1
        fi
done

echo all dependencies found
