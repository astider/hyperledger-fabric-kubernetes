echo "Initializing... (npm install)"
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
cd $APPLICATION_PATH
npm install
sleep 10
echo "Creating Wallet..."
node enrollAdmin.js
node registerUser.js
echo "Wallet (should be successfully) created."

sleep 5
echo "Starting the server..."
node server.js