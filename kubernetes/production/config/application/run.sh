echo "Initializing... (npm install)"
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
cd $APPLICATION_PATH
npm install
sleep 10
echo ""
echo "Creating Wallet..."
node enrollAdmin.js
echo "Enrolled Admin."
echo ""
WALLET_USER_ID=$(date +%s)
echo "Registering user: $WALLET_USER_ID"
node registerUser.js $WALLET_USER_ID
echo "+++++++++++++++++++++++++++++++++++++++++++++++++++++"
echo "Wallet (should be successfully) created."
echo "+++++++++++++++++++++++++++++++++++++++++++++++++++++"

sleep 5
echo "Starting the server..."
node server.js $WALLET_USER_ID