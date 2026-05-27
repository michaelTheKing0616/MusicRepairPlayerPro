import React from 'react';
import {Button, Card, Text} from 'react-native-paper';
import {View, StyleSheet} from 'react-native';
import {createLogger} from '../utils/logger';

const log = createLogger('AppErrorBoundary');

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  override componentDidCatch(error: Error) {
    log.warn('caught', {message: error.message, stack: error.stack});
  }

  private reset = () => this.setState({error: null});

  override render() {
    const {children} = this.props;
    const {error} = this.state;
    if (!error) return children;

    return (
      <View style={styles.outer}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Something went wrong</Text>
            <Text style={styles.detail} selectable>
              {error.message}
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={this.reset}>
              Try again
            </Button>
          </Card.Actions>
        </Card>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    elevation: 2,
  },
  detail: {
    marginTop: 8,
  },
});
