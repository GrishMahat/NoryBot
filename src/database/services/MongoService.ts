import mongoose from 'mongoose';
import 'colors';
import { EventEmitter } from 'events';

export class MongoService extends EventEmitter {
	private static instance: MongoService;
	private isConnected = false;
	private reconnectAttempts = 0;
	private readonly MAX_RECONNECT_ATTEMPTS = 5;
	private readonly RECONNECT_INTERVAL = 5000;

	private constructor() {
		super();
		this.setupMongooseEvents();
	}

	public static getInstance(): MongoService {
		if (!MongoService.instance) {
			MongoService.instance = new MongoService();
		}
		return MongoService.instance;
	}

	private setupMongooseEvents(): void {
		mongoose.connection.on('connected', () => {
			this.isConnected = true;
			this.reconnectAttempts = 0;
			this.emit('connected');
		});

		mongoose.connection.on('error', (error) => {
			console.error('MongoDB connection error:'.red, error);
			this.emit('error', error);
		});

		mongoose.connection.on('disconnected', () => {
			this.isConnected = false;
			console.log('MongoDB disconnected'.yellow);
			this.emit('disconnected');
			this.handleReconnect();
		});
	}

	private handleReconnect(): void {
		if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
			console.error('Max reconnection attempts reached. Please check your MongoDB connection.'.red);
			this.emit('maxReconnectAttemptsReached');
			return;
		}
		this.reconnectAttempts++;
		console.log(
			`Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`
				.yellow,
		);

		setTimeout(async () => {
			try {
				await this.connect();
			} catch (error) {
				console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`.red, error);
			}
		}, this.RECONNECT_INTERVAL);
	}

	public async connect(): Promise<void> {
		if (this.isConnected) {
			return;
		}

		const mongoURI = process.env.MONGODB_TOKEN;
		if (!mongoURI) {
			throw new Error('MongoDB connection string is not defined in environment variables');
		}

		try {
			mongoose.set('strictQuery', true);
			await mongoose.connect(mongoURI, {
				serverSelectionTimeoutMS: 15000,
				heartbeatFrequencyMS: 30000,
				maxPoolSize: 10,
				minPoolSize: 2,
				socketTimeoutMS: 45000,
			});
		} catch (error) {
			console.error('Failed to connect to MongoDB:'.red, error);
			throw error;
		}
	}

	public async disconnect(): Promise<void> {
		try {
			await mongoose.disconnect();
			this.isConnected = false;
			console.log('MongoDB disconnected successfully'.yellow);
		} catch (error) {
			console.error('Error disconnecting from MongoDB:'.red, error);
			throw error;
		}
	}

	public getConnectionStatus(): boolean {
		return this.isConnected;
	}

	public getMongoose(): typeof mongoose {
		return mongoose;
	}
}
