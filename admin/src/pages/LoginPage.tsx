import { useState } from 'react';
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCamera } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) => (value.length > 0 ? null : 'Mot de passe requis'),
    },
  });

  async function handleSubmit(values: LoginFormValues) {
    setError(null);
    setLoading(true);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from ?? '/settings';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100vh" bg="brand.0">
      <Stack align="center" gap="xl">
        <Stack align="center" gap={6}>
          <ThemeIcon size={44} radius="md" color="brand.6">
            <IconCamera size={24} />
          </ThemeIcon>
          <Text fw={700} size="lg" c="brand.9">
            Pixellia
          </Text>
        </Stack>
        <Paper shadow="md" p="xl" radius="lg" w={380}>
          <Title order={3} mb="md" ta="center">
            Administration
          </Title>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              {error && (
                <Alert color="red" title="Erreur">
                  {error}
                </Alert>
              )}
              <TextInput
                label="Email"
                placeholder="admin@frejus.local"
                {...form.getInputProps('email')}
              />
              <PasswordInput label="Mot de passe" {...form.getInputProps('password')} />
              <Button type="submit" loading={loading} fullWidth mt="sm">
                Se connecter
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Center>
  );
}
