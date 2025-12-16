import mongoose from 'mongoose';
import 'colors';
import { EventEmitter } from 'events';
import { logs } from '@/services/logs';

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
			logs.error(error, { tag: 'MongoDB', context: 'connection' });
			this.emit('error', error);
		});

		mongoose.connection.on('disconnected', () => {
			this.isConnected = false;
			logs.warn('MongoDB disconnected', { tag: 'MongoDB' });
			this.emit('disconnected');
			this.handleReconnect();
		});
	}

	private handleReconnect(): void {
		if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
			logs.error('Max reconnection attempts reached. Please check your MongoDB connection.', {
				tag: 'MongoDB',
			});
			this.emit('maxReconnectAttemptsReached');
			return;
		}

		this.reconnectAttempts++;
		logs.warn(
			`Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`,
			{ tag: 'MongoDB' },
		);

		setTimeout(async () => {
			try {
				await this.connect();
			} catch (error) {
				logs.error(
					`Reconnection attempt ${this.reconnectAttempts} failed: ${error instanceof Error ? error.message : String(error)}`,
					{ tag: 'MongoDB', context: error },
				);
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
			logs.error(error, { tag: 'MongoDB', context: 'connect' });
			throw error;
		}
	}

	public async disconnect(): Promise<void> {
		try {
			await mongoose.disconnect();
			this.isConnected = false;
			logs.info('MongoDB disconnected successfully', { tag: 'MongoDB' });
		} catch (error) {
			logs.error(error, { tag: 'MongoDB', context: 'disconnect' });
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
