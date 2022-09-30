

msg="noise1"

npm run build
git add -A
git commit -m "$msg"
git push -u origin main
rsync -avx --progress build/ br:"/data/sites/jilinchen.com/xiaqiu/$msg/"
echo $msg